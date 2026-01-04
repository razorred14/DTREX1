use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct AppState {
    rpc_url: Arc<Mutex<String>>,
    connection_mode: Arc<Mutex<String>>, // "full_node" or "wallet"
    ssl_cert_path_full_node: Arc<Mutex<Option<String>>>,
    ssl_key_path_full_node: Arc<Mutex<Option<String>>>,
    ssl_cert_path_wallet: Arc<Mutex<Option<String>>>,
    ssl_key_path_wallet: Arc<Mutex<Option<String>>>,
    ssl_ca_path_full_node: Arc<Mutex<Option<String>>>,
    ssl_ca_path_wallet: Arc<Mutex<Option<String>>>,
}

impl AppState {
    pub fn new(initial_url: String) -> Self {
        Self {
            rpc_url: Arc::new(Mutex::new(initial_url)),
            connection_mode: Arc::new(Mutex::new("full_node".to_string())),
            ssl_cert_path_full_node: Arc::new(Mutex::new(None)),
            ssl_key_path_full_node: Arc::new(Mutex::new(None)),
            ssl_cert_path_wallet: Arc::new(Mutex::new(None)),
            ssl_key_path_wallet: Arc::new(Mutex::new(None)),
            ssl_ca_path_full_node: Arc::new(Mutex::new(None)),
            ssl_ca_path_wallet: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn set_rpc_url(&self, url: String) {
        let mut guard = self.rpc_url.lock().await;
        *guard = url;
    }

    pub async fn rpc_url(&self) -> String {
        let guard = self.rpc_url.lock().await;
        guard.clone()
    }

    pub async fn set_connection_mode(&self, mode: String) {
        let mut guard = self.connection_mode.lock().await;
        *guard = mode;
    }

    pub async fn connection_mode(&self) -> String {
        let guard = self.connection_mode.lock().await;
        guard.clone()
    }

    pub async fn set_ssl_paths_for_mode(&self, mode: &str, cert_path: String, key_path: String) {
        if mode == "wallet" {
            let mut cert_guard = self.ssl_cert_path_wallet.lock().await;
            *cert_guard = Some(cert_path.clone());
            let mut key_guard = self.ssl_key_path_wallet.lock().await;
            *key_guard = Some(key_path.clone());
        } else {
            let mut cert_guard = self.ssl_cert_path_full_node.lock().await;
            *cert_guard = Some(cert_path.clone());
            let mut key_guard = self.ssl_key_path_full_node.lock().await;
            *key_guard = Some(key_path.clone());
        }
    }

    pub async fn get_ssl_paths(&self) -> (Option<String>, Option<String>) {
        let mode = self.connection_mode.lock().await.clone();
        if mode == "wallet" {
            let cert = self.ssl_cert_path_wallet.lock().await;
            let key = self.ssl_key_path_wallet.lock().await;
            (cert.clone(), key.clone())
        } else {
            let cert = self.ssl_cert_path_full_node.lock().await;
            let key = self.ssl_key_path_full_node.lock().await;
            (cert.clone(), key.clone())
        }
    }

    // Set PKCS#12 identity path and optional password


    pub async fn set_ssl_ca_path_for_mode(&self, mode: &str, ca_path: String) {
        if mode == "wallet" {
            let mut guard = self.ssl_ca_path_wallet.lock().await;
            *guard = Some(ca_path.clone());
        } else {
            let mut guard = self.ssl_ca_path_full_node.lock().await;
            *guard = Some(ca_path.clone());
        }
    }

    pub async fn get_ssl_ca_path_for_mode(&self, mode: &str) -> Option<String> {
        if mode == "wallet" {
            let guard = self.ssl_ca_path_wallet.lock().await;
            guard.clone()
        } else {
            let guard = self.ssl_ca_path_full_node.lock().await;
            guard.clone()
        }
    }
}
