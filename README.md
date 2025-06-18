# pov-platform

## Required Kubernetes Secrets

This application requires the following Kubernetes secrets to be present in the `pov-platform` namespace:

### 1. Harbor Registry Secret
- **Name:** `harbor-registry-secret`
- **Namespace:** `pov-platform`
- **Type:** `kubernetes.io/dockerconfigjson`
- **Purpose:** Allows Kubernetes to pull container images from the Harbor registry.
- **How to create:**
  ```sh
  kubectl create secret docker-registry harbor-registry-secret \
    --docker-server=harbor.k8s.ng20.org \
    --docker-username=<your-username> \
    --docker-password=<your-password> \
    --docker-email=<your-email> \
    --namespace=pov-platform
  ```

### 2. Google OAuth Secret
- **Name:** `google-oauth-secret`
- **Namespace:** `pov-platform`
- **Type:** `Opaque`
- **Purpose:** Stores Google OAuth2 credentials for backend authentication.
- **Expected keys:**
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- **How to create:**
  ```sh
  kubectl create secret generic google-oauth-secret \
    --from-literal=GOOGLE_CLIENT_ID=<your-client-id> \
    --from-literal=GOOGLE_CLIENT_SECRET=<your-client-secret> \
    -n pov-platform
  ```

---

Ensure these secrets are created before deploying the application components.