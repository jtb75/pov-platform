REGISTRY=harbor.k8s.ng20.org/pov-platform
PLATFORM=linux/amd64

.PHONY: all backend db-manager frontend push-backend push-db-manager push-frontend

all: backend db-manager frontend

backend:
	docker build --platform=$(PLATFORM) -t $(REGISTRY)/backend:latest ./backend
	docker push $(REGISTRY)/backend:latest
	kubectl rollout restart deployment pov-backend -n pov-platform

db-manager:
	docker build --platform=$(PLATFORM) -t $(REGISTRY)/db-manager:latest -f db-manager/Dockerfile .
	docker push $(REGISTRY)/db-manager:latest
	kubectl delete job pov-db-manager -n pov-platform --ignore-not-found
	kubectl apply -f k8s-manifests/db-manager.yaml

frontend:
	docker build --platform=$(PLATFORM) -t $(REGISTRY)/frontend:latest ./frontend
	docker push $(REGISTRY)/frontend:latest
	kubectl rollout restart deployment pov-frontend -n pov-platform
