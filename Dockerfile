FROM ghcr.io/denoland/deno:alpine-2.9.2

# Arguments
ARG APP_HOME=/home/node/app

# Install system dependencies
# "Don't rely on the base image for tools; if you call it, you install it." ;)
RUN apk add --no-cache tini git git-lfs su-exec shadow dos2unix shadow

# Create node user
RUN useradd -m -s /bin/sh node
USER node

# Create app directory and set ownership
WORKDIR ${APP_HOME}
RUN chown node:node ${APP_HOME}

# Set environment variables
ENV NODE_ENV=production
ENV NAPI_RS_FORCE_WASI="error"
ENV DENO_DIR=${APP_HOME}/.cache/deno

# Bundle app source and set ownership
COPY --chown=node:node . ./

RUN \
  echo "*** Install dependencies***" && \
  deno install --arch wasm32 --os wasip1-threads --prod --allow-scripts -q && deno clean

# Create config directory and link config.yaml. Added hardcoded dirs(constants.js?)
# that must be present for Non-Root Mode and volumeless docker runs.
RUN mkdir -p data plugins public/scripts/extensions/third-party backups && \
  chown -R node:node data plugins public/scripts/extensions/third-party backups

# Pre-compile public libraries
RUN \
  echo "*** Run Rolldown ***" && \
  deno --allow-all "./docker/build-lib.js"

# Set the entrypoint script and cleanup
RUN \
  echo "*** Cleanup ***" && \
  mv "./docker/docker-entrypoint.sh" "./" && \
  echo "*** Make docker-entrypoint.sh executable ***" && \
  chmod +x "./docker-entrypoint.sh" && \
  echo "*** Convert line endings to Unix format ***" && \
  dos2unix "./docker-entrypoint.sh" && \
  rm -rf "./docker"

# Fix extension repos permissions
RUN git config --global --add safe.directory "*"

EXPOSE 8000

# Ensure proper handling of kernel signals
#ENTRYPOINT ["tini", "--", "./docker-entrypoint.sh"]
