# Use your custom base image that likely contains Node.js runtime and maybe other tools
FROM naveengali80/smarthomes_products:latest

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker cache
# This assumes package*.json are at the root of your backend repo
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production # Install only production dependencies

# Copy the rest of your backend application code
COPY . .

# Expose the port your Node.js app listens on (as per your .env and README)
ENV PORT 5001
EXPOSE 5001

# Command to run your Node.js application
# Adjust "npm run dev" if your production start command is different (e.g., "node server.js")
CMD [ "npm", "run", "dev" ]