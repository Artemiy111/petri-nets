# Timed Petri Nets Simulator

![image](https://github.com/user-attachments/assets/d1874892-d7ca-4daf-92e8-8d30b20c1e68)

### Run program

```sh
bun install
bun run dev
```

Go to http://localhost:3000

### Run with Docker

```sh
docker compose up --build
```

Go to http://localhost:3000. To publish a different port, set `APP_PORT`:

```sh
APP_PORT=8080 docker compose up --build
```

The production image is built with `docker build -t petri-nets .` and served on port 3000.

## License

Licensed under the [Apache License, Version 2.0](LICENSE). See [NOTICE](NOTICE) for attribution.
