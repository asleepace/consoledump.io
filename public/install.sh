#!/bin/bash

set -e

# Create bun-style directory structure
mkdir -p ~/.consoledump/bin

# Target environment
# ENDPOINT=https://consoledump.io/
ENDPOINT=http://127.0.0.1:8082

# Install the consoledump binary
cat > ~/.consoledump/bin/consoledump << EOF
#!/bin/bash
ROUTE=\${1:-"default"}
CDUMP="$ENDPOINT"
echo -e "\033[1;33m[consoledump]\033[0m piping output to \033[4;36m\$CDUMP/\$ROUTE\033[0m"
while read line; do
  curl -s -d "\$line" "$ENDPOINT/\$ROUTE"
done
EOF

chmod +x ~/.consoledump/bin/consoledump

# Add to PATH in shell profiles
CONSOLEDUMP_PATH="export PATH=\"\$HOME/.consoledump/bin:\$PATH\""

for profile in ~/.bashrc ~/.zshrc ~/.bash_profile ~/.profile; do
  if [[ -f "$profile" ]] && ! grep -q "consoledump/bin" "$profile"; then
    echo "" >> "$profile"
    echo "# consoledump" >> "$profile"
    echo "$CONSOLEDUMP_PATH" >> "$profile"
  fi
done

# Add to current session PATH so it works immediately
export PATH="$HOME/.consoledump/bin:$PATH"
