FROM node:20-slim

WORKDIR /app

# Install git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Clone the frontend repo
RUN git clone https://github.com/broadinstitute/chronos_portal_frontend.git .

# Install dependencies
RUN npm install --legacy-peer-deps

# Build-time argument for backend URL (default to localhost for local dev)
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

# Build the production bundle
RUN npm run build

EXPOSE 5173

# Serve with Vite preview (production server)
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
