#!/bin/bash
set -e

REGISTRY=harbor.k8s.ng20.org/pov-platform

# Build and push backend

docker build --platform=linux/amd64 -t $REGISTRY/backend:latest ./backend

docker push $REGISTRY/backend:latest

# Build and push db-manager (from project root)
docker build --platform=linux/amd64 -t $REGISTRY/db-manager:latest -f db-manager/Dockerfile .
docker push $REGISTRY/db-manager:latest

# Build and push frontend

docker build --platform=linux/amd64 -t $REGISTRY/frontend:latest ./frontend

docker push $REGISTRY/frontend:latest

echo "All images built and pushed for linux/amd64." 