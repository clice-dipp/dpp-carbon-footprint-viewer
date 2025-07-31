FROM alpine:3.20

COPY . /opt/frontend
RUN apk add --no-cache npm &&  \
    npm install --global sirv-cli && \
    cd /opt/frontend &&  \
    npm install &&  \
    npm run build-only &&  \
    mv /opt/frontend/dist /opt/static &&  \
    mv /opt/frontend/run.sh /run.sh && \
    rm -rf /opt/frontend

ENV ASSET_ADMINISTRATION_SHELL_REGISTRY_URL=""
ENV ASSET_ADMINISTRATION_SHELL_REPOSITORY_URL=""
ENV ASSET_ADMINISTRATION_SHELL_SUBMODEL_REPOSITORY_URL=""
ENV ASSET_ADMINISTRATION_SHELL_ADDITIONALS_URL=""
ENV PREFER_SUBMODELS_REPOSITORY=""

EXPOSE 8080
ENTRYPOINT sh /run.sh sirv /opt/static --single --host
