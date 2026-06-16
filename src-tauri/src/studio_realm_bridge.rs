use nimi_shell_tauri::runtime_bridge;
use reqwest::{Client, Method, Url};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::time::Duration;

const STUDIO_APP_ID: &str = "nimi.realm-agent-studio";
const STUDIO_APP_INSTANCE_ID: &str = "nimi.realm-agent-studio.local-developer";
const STUDIO_DEVICE_ID: &str = "realm-agent-studio-local-developer-device";
const DEFAULT_TIMEOUT_MS: u64 = 30_000;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StudioRealmUnaryPayload {
    pub method_id: String,
    pub realm_base_url: String,
    pub request: Value,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudioRealmUnaryResult {
    pub response: Value,
}

#[derive(Debug, Clone)]
struct RealmOperation {
    method_id: &'static str,
    http_method: Method,
    path: &'static str,
}

#[tauri::command]
pub async fn realm_agent_studio_realm_unary(
    payload: StudioRealmUnaryPayload,
) -> Result<StudioRealmUnaryResult, String> {
    let operation = resolve_operation(payload.method_id.as_str())?;
    let request = request_object(&payload.request);
    let path_values = object_field(request, "path");
    let query_values = object_field(request, "query");
    let body = request.get("body").cloned().unwrap_or(Value::Null);
    assert_host_authorized_realm_base_url(payload.realm_base_url.as_str())?;
    let url = build_url(
        payload.realm_base_url.as_str(),
        operation.path,
        path_values,
        query_values,
    )?;
    let token = issue_runtime_account_access_token(payload.timeout_ms).await?;

    let timeout_ms = payload.timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS);
    let client = Client::new();
    let mut builder = client
        .request(operation.http_method.clone(), url)
        .timeout(Duration::from_millis(timeout_ms))
        .bearer_auth(token)
        .header("accept", "application/json");

    if operation.http_method != Method::GET
        && operation.http_method != Method::HEAD
        && !body.is_null()
    {
        let bytes = serde_json::to_vec(&body)
            .map_err(|error| format!("REALM_AGENT_STUDIO_REALM_BODY_ENCODE_FAILED: {error}"))?;
        builder = builder
            .header("content-type", "application/json")
            .body(bytes);
    }

    let response = builder
        .send()
        .await
        .map_err(|error| format!("REALM_AGENT_STUDIO_REALM_FETCH_FAILED: {error}"))?;
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|error| format!("REALM_AGENT_STUDIO_REALM_RESPONSE_READ_FAILED: {error}"))?;

    if !status.is_success() {
        return Err(format!(
            "REALM_AGENT_STUDIO_REALM_HTTP_{}: {}",
            status.as_u16(),
            trim_error_body(text.as_str()),
        ));
    }

    if text.trim().is_empty() {
        return Ok(StudioRealmUnaryResult {
            response: Value::Null,
        });
    }

    let response_json = serde_json::from_str::<Value>(&text)
        .map_err(|error| format!("REALM_AGENT_STUDIO_REALM_RESPONSE_DECODE_FAILED: {error}"))?;
    Ok(StudioRealmUnaryResult {
        response: response_json,
    })
}

async fn issue_runtime_account_access_token(timeout_ms: Option<u64>) -> Result<String, String> {
    let request = runtime_bridge::generated::GetAccessTokenRequest {
        caller: Some(runtime_bridge::generated::AccountCaller {
            app_id: STUDIO_APP_ID.to_string(),
            app_instance_id: STUDIO_APP_INSTANCE_ID.to_string(),
            device_id: STUDIO_DEVICE_ID.to_string(),
            mode: runtime_bridge::generated::AccountCallerMode::LocalDeveloperApp as i32,
            scopes: vec![],
        }),
        requested_scopes: vec![],
    };
    let metadata = runtime_bridge::RuntimeBridgeMetadata {
        app_id: Some(STUDIO_APP_ID.to_string()),
        participant_id: Some(STUDIO_APP_ID.to_string()),
        caller_kind: Some("third-party-app".to_string()),
        caller_id: Some(STUDIO_APP_ID.to_string()),
        surface_id: Some("realm-agent-studio.realm-bridge".to_string()),
        domain: Some("runtime.account".to_string()),
        ..Default::default()
    };
    let response: runtime_bridge::generated::GetAccessTokenResponse =
        match runtime_bridge::invoke_unary_typed_with_metadata(
            runtime_bridge::RUNTIME_ACCOUNT_GET_ACCESS_TOKEN_METHOD_ID,
            request,
            metadata,
            Some(timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS)),
        )
        .await
        {
            Ok(response) => response,
            Err(error) => {
                eprintln!("[realm-agent-studio] realm_bridge token_error={error}");
                return Err(error);
            }
        };

    if !response.accepted || response.access_token.trim().is_empty() {
        eprintln!(
            "[realm-agent-studio] realm_bridge token_rejected reason={} account_reason={}",
            response.reason_code, response.account_reason_code
        );
        return Err(format!(
            "REALM_AGENT_STUDIO_RUNTIME_ACCOUNT_TOKEN_UNAVAILABLE: reason={} accountReason={}",
            response.reason_code, response.account_reason_code,
        ));
    }
    Ok(response.access_token)
}

fn resolve_operation(method_id: &str) -> Result<RealmOperation, String> {
    const OPERATIONS: &[RealmOperation] = &[
        RealmOperation {
            method_id: "listMyRealmAgents",
            http_method: Method::GET,
            path: "/api/me/agents",
        },
        RealmOperation {
            method_id: "getMyRealmAgent",
            http_method: Method::GET,
            path: "/api/me/agents/{agentId}",
        },
        RealmOperation {
            method_id: "listForgeImportedSystemAgents",
            http_method: Method::GET,
            path: "/api/agent/forge-imported-system/agents",
        },
        RealmOperation {
            method_id: "getForgeImportedSystemAgent",
            http_method: Method::GET,
            path: "/api/agent/forge-imported-system/agents/{agentId}",
        },
        RealmOperation {
            method_id: "WorldController_listWorlds",
            http_method: Method::GET,
            path: "/api/world",
        },
        RealmOperation {
            method_id: "WorldController_getWorldDetailWithAgents",
            http_method: Method::GET,
            path: "/api/world/by-id/{id}/detail-with-agents",
        },
        RealmOperation {
            method_id: "AgentController_checkHandle",
            http_method: Method::GET,
            path: "/api/agent/handles/check",
        },
        RealmOperation {
            method_id: "AgentController_create",
            http_method: Method::POST,
            path: "/api/agent",
        },
        RealmOperation {
            method_id: "AgentController_selectAvatar",
            http_method: Method::POST,
            path: "/api/agent/accounts/{id}/avatar",
        },
        RealmOperation {
            method_id: "AgentController_getVisibility",
            http_method: Method::GET,
            path: "/api/agent/accounts/{id}/visibility",
        },
        RealmOperation {
            method_id: "AgentController_updateVisibility",
            http_method: Method::PATCH,
            path: "/api/agent/accounts/{id}/visibility",
        },
        RealmOperation {
            method_id: "getMyRealmAgentSettings",
            http_method: Method::GET,
            path: "/api/me/agents/{agentId}/settings",
        },
        RealmOperation {
            method_id: "updateMyRealmAgentSettings",
            http_method: Method::PATCH,
            path: "/api/me/agents/{agentId}/settings",
        },
        RealmOperation {
            method_id: "getForgeImportedSystemAgentSettings",
            http_method: Method::GET,
            path: "/api/agent/forge-imported-system/agents/{agentId}/settings",
        },
        RealmOperation {
            method_id: "updateForgeImportedSystemAgentSettings",
            http_method: Method::PATCH,
            path: "/api/agent/forge-imported-system/agents/{agentId}/settings",
        },
        RealmOperation {
            method_id: "updateForgeImportedSystemAgentProfileMedia",
            http_method: Method::PATCH,
            path: "/api/agent/forge-imported-system/agents/{agentId}/profile-media",
        },
        RealmOperation {
            method_id: "updateForgeImportedSystemAgentVoice",
            http_method: Method::PATCH,
            path: "/api/agent/forge-imported-system/agents/{agentId}/voice",
        },
        RealmOperation {
            method_id: "getForgeImportedSystemAgentChatReadiness",
            http_method: Method::GET,
            path: "/api/agent/forge-imported-system/agents/{agentId}/chat-readiness",
        },
        RealmOperation {
            method_id: "projectRuntimePayload",
            http_method: Method::POST,
            path: "/api/runtime/projections/project",
        },
        RealmOperation {
            method_id: "createPost",
            http_method: Method::POST,
            path: "/api/world/posts",
        },
        RealmOperation {
            method_id: "listResources",
            http_method: Method::GET,
            path: "/api/resources",
        },
        RealmOperation {
            method_id: "createImageDirectUpload",
            http_method: Method::POST,
            path: "/api/resources/images/direct-upload",
        },
        RealmOperation {
            method_id: "createVideoDirectUpload",
            http_method: Method::POST,
            path: "/api/resources/videos/direct-upload",
        },
        RealmOperation {
            method_id: "createAudioDirectUpload",
            http_method: Method::POST,
            path: "/api/resources/audio/direct-upload",
        },
        RealmOperation {
            method_id: "finalizeResource",
            http_method: Method::POST,
            path: "/api/resources/{resourceId}/finalize",
        },
        RealmOperation {
            method_id: "createTextResource",
            http_method: Method::POST,
            path: "/api/resources/texts",
        },
    ];

    OPERATIONS
        .iter()
        .find(|operation| operation.method_id == method_id)
        .cloned()
        .ok_or_else(|| format!("REALM_AGENT_STUDIO_REALM_METHOD_FORBIDDEN: {method_id}"))
}

fn build_url(
    base_url: &str,
    path_template: &str,
    path_values: &Map<String, Value>,
    query_values: &Map<String, Value>,
) -> Result<Url, String> {
    let base = base_url.trim().trim_end_matches('/');
    if base.is_empty() {
        return Err("REALM_AGENT_STUDIO_REALM_BASE_URL_REQUIRED".to_string());
    }
    let path = expand_path(path_template, path_values)?;
    let mut url = Url::parse(format!("{base}{path}").as_str())
        .map_err(|error| format!("REALM_AGENT_STUDIO_REALM_URL_INVALID: {error}"))?;
    if url.scheme() != "http" && url.scheme() != "https" {
        return Err("REALM_AGENT_STUDIO_REALM_URL_SCHEME_INVALID".to_string());
    }
    append_query(&mut url, query_values);
    Ok(url)
}

fn assert_host_authorized_realm_base_url(base_url: &str) -> Result<(), String> {
    let requested = canonical_realm_base_url(base_url)?;
    let host_default = nimi_shell_tauri::runtime_defaults::runtime_defaults();
    let authorized = canonical_realm_base_url(host_default.realm.realm_base_url.as_str())?;
    if requested != authorized {
        return Err("REALM_AGENT_STUDIO_REALM_BASE_URL_FORBIDDEN".to_string());
    }
    Ok(())
}

fn canonical_realm_base_url(base_url: &str) -> Result<String, String> {
    let value = base_url.trim().trim_end_matches('/');
    if value.is_empty() {
        return Err("REALM_AGENT_STUDIO_REALM_BASE_URL_REQUIRED".to_string());
    }
    let url = Url::parse(value)
        .map_err(|error| format!("REALM_AGENT_STUDIO_REALM_URL_INVALID: {error}"))?;
    if url.scheme() != "http" && url.scheme() != "https" {
        return Err("REALM_AGENT_STUDIO_REALM_URL_SCHEME_INVALID".to_string());
    }
    let scheme = url.scheme();
    let host = url
        .host_str()
        .ok_or_else(|| "REALM_AGENT_STUDIO_REALM_HOST_REQUIRED".to_string())?
        .to_ascii_lowercase();
    let port = url
        .port_or_known_default()
        .ok_or_else(|| "REALM_AGENT_STUDIO_REALM_PORT_REQUIRED".to_string())?;
    let path = url.path().trim_end_matches('/');
    let normalized_path = if path.is_empty() { "" } else { path };
    Ok(format!("{scheme}://{host}:{port}{normalized_path}"))
}

fn expand_path(template: &str, path_values: &Map<String, Value>) -> Result<String, String> {
    let mut path = template.to_string();
    for (key, value) in path_values {
        let token = format!("{{{key}}}");
        if path.contains(token.as_str()) {
            path = path.replace(
                token.as_str(),
                encode_path_segment(value_to_string(value)).as_str(),
            );
        }
    }
    if path.contains('{') || path.contains('}') {
        return Err(format!(
            "REALM_AGENT_STUDIO_REALM_PATH_PARAMETER_REQUIRED: {template}"
        ));
    }
    Ok(path)
}

fn append_query(url: &mut Url, query_values: &Map<String, Value>) {
    let mut collected = Vec::new();
    for (key, value) in query_values {
        collect_query_value(&mut collected, key, value);
    }
    let mut pairs = url.query_pairs_mut();
    for (key, value) in collected {
        pairs.append_pair(key.as_str(), value.as_str());
    }
}

fn collect_query_value(pairs: &mut Vec<(String, String)>, key: &str, value: &Value) {
    match value {
        Value::Null => {}
        Value::Array(items) => {
            for item in items {
                collect_query_value(pairs, key, item);
            }
        }
        _ => pairs.push((key.to_string(), value_to_string(value))),
    }
}

fn value_to_string(value: &Value) -> String {
    match value {
        Value::String(text) => text.clone(),
        Value::Bool(flag) => flag.to_string(),
        Value::Number(number) => number.to_string(),
        other => other.to_string(),
    }
}

fn request_object(value: &Value) -> &Map<String, Value> {
    value.as_object().unwrap_or_else(|| empty_object())
}

fn object_field<'a>(value: &'a Map<String, Value>, key: &str) -> &'a Map<String, Value> {
    value
        .get(key)
        .and_then(Value::as_object)
        .unwrap_or_else(|| empty_object())
}

fn empty_object() -> &'static Map<String, Value> {
    static EMPTY: std::sync::OnceLock<Map<String, Value>> = std::sync::OnceLock::new();
    EMPTY.get_or_init(Map::new)
}

fn encode_path_segment(value: String) -> String {
    let mut out = String::new();
    for byte in value.bytes() {
        let allowed = byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~');
        if allowed {
            out.push(byte as char);
        } else {
            out.push_str(format!("%{byte:02X}").as_str());
        }
    }
    out
}

fn trim_error_body(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.len() > 500 {
        format!("{}...", &trimmed[..500])
    } else {
        trimmed.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Mutex, OnceLock};

    fn with_env_var(key: &str, value: Option<&str>, run: impl FnOnce()) {
        static ENV_LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        let _guard = ENV_LOCK
            .get_or_init(|| Mutex::new(()))
            .lock()
            .expect("env lock");
        let saved = std::env::var(key).ok();
        match value {
            Some(value) => std::env::set_var(key, value),
            None => std::env::remove_var(key),
        }
        run();
        match saved {
            Some(value) => std::env::set_var(key, value),
            None => std::env::remove_var(key),
        }
    }

    #[test]
    fn realm_bridge_rejects_renderer_supplied_foreign_base_url() {
        with_env_var("NIMI_REALM_URL", Some("http://localhost:3002"), || {
            let error =
                assert_host_authorized_realm_base_url("https://attacker.example").unwrap_err();
            assert_eq!(error, "REALM_AGENT_STUDIO_REALM_BASE_URL_FORBIDDEN");
        });
    }

    #[test]
    fn realm_bridge_accepts_host_runtime_default_base_url_with_trailing_slash() {
        with_env_var("NIMI_REALM_URL", Some("http://localhost:3002"), || {
            assert!(assert_host_authorized_realm_base_url("http://localhost:3002/").is_ok());
        });
    }

    #[test]
    fn realm_bridge_canonicalizes_known_default_ports() {
        let http = canonical_realm_base_url("http://LOCALHOST").expect("http base url");
        let https = canonical_realm_base_url("https://Realm.Example/").expect("https base url");

        assert_eq!(http, "http://localhost:80");
        assert_eq!(https, "https://realm.example:443");
    }
}
