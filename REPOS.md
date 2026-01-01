# Repo Map (LibreChat Root)

This file lists all repositories used in the LibreChat project, where they live
locally, and what they contain.

Active repos (use these)
- LibreChat app (fork)
  - Local: /home/danielv/LibreChat
  - Remote: https://github.com/Daniel-DDV/LibreChat
  - What: Core LibreChat server + client; EduGPT features live here.
- librechat-config
  - Local: /home/danielv/librechat-config
  - Remote: https://github.com/Daniel-DDV/chat.civiqs.librechat-config
  - What: librechat.yaml, docker-compose override, assets, patches, deploy scripts.
- skill-gateway
  - Local: /home/danielv/skill-gateway
  - Remote: https://github.com/Daniel-DDV/skill-gateway
  - What: LLM/skill orchestration service; status relay into LibreChat.
- librechat-proxy (canonical)
  - Local: /home/danielv/librechat-proxy
  - Remote: https://github.com/Daniel-DDV/librechat-proxy-secure
  - What: Proxy service for model routing and policy enforcement; legacy v2
    code under legacy/v2/.

Archived repos (do not use for new work)
- https://github.com/Daniel-DDV/librechat-proxy
- https://github.com/Daniel-DDV/librechat-proxy-v2
