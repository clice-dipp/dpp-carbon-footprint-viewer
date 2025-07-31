#!/bin/sh
echo "{
  \"assetAdministrationShellRegistryUrl\": \"$ASSET_ADMINISTRATION_SHELL_REGISTRY_URL\",
  \"assetAdministrationShellRepositoryUrl\": \"$ASSET_ADMINISTRATION_SHELL_REPOSITORY_URL\",
  \"assetAdministrationShellSubmodelRepositoryUrl\": \"$ASSET_ADMINISTRATION_SHELL_SUBMODEL_REPOSITORY_URL\",
  \"assetAdministrationShellAdditionalsUrl\": \"$ASSET_ADMINISTRATION_SHELL_ADDITIONALS_URL\",
  \"preferSubmodelRepository\": \"$PREFER_SUBMODELS_REPOSITORY\",
}" > /opt/static/config.json
exec "$@"
