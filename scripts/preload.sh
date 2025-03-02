#!/bin/bash

echo "This script is no longer needed as templates are now loaded locally in the app."
echo "The templates are defined directly in the app/templates/page.tsx and app/templates/[id]/page.tsx files."
echo "If you need to preload templates to the database in the future, modify the preload-templates.js script."
exit 0

# The code below is kept for reference in case database loading is needed in the future
: <<'COMMENT'
# Change to the scripts directory
cd "$(dirname "$0")"

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found in scripts directory."
  echo "Please create a .env file with your Supabase credentials:"
  echo "NEXT_PUBLIC_SUPABASE_URL=your-supabase-url"
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
  exit 1
fi

# Make the script executable
chmod +x preload-templates.js

# Install dependencies if needed
npm install

# Run the preload script
echo "Starting template preload script..."
node preload-templates.js

# Check if the script executed successfully
if [ $? -eq 0 ]; then
  echo "Template preload completed successfully!"
else
  echo "Template preload encountered errors. Please check the output above."
fi
COMMENT 