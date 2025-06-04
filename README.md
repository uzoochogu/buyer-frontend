# Buyer Frontend

## Installing Dependencies

- Node - You can use [nvm](https://github.com/nvm-sh/nvm) to manage node versions. 23.9.0 was used for initial development (latest at time of writing).

    using nvm:

    ```bash
    nvm install latest
    nvm use 23.9.0
    npm install
    ```

### Running frontend

Populate the dev environments with the correct values.

Sample `.env.production` for preview deployment:

```txt
VITE_APP_BACKEND_URL=
```

Sample `.env.development`

```txt
VITE_APP_BACKEND_URL=http://localhost:5555
```

To run the frontend, run:

```bash
npm run dev
```

Default port is `5173`, which can be configured in [`vite.config.js`](./vite.config.js).

Ensure that the backend server all dependent services are running.

## Scripts

### Development

```bash
npm run dev
```

### Production (Preview)

To preview production deployment, you can use ngrok to tunnel the frontend to a public URL. Note that default port is `4173`, which can also be configured in [`vite.config.js`](./vite.config.js).  

```bash
npm run preview
```

The current vite configuration ensures requests to the backend server are reverse proxied through the frontend app.
