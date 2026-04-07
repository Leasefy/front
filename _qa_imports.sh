#!/bin/bash
cd /Users/nicolasgarcia/rent/mvp
grep -rh "from '@/" src/app/panel/inmobiliaria/ src/components/inmobiliaria/ --include="*.tsx" | grep -oP "from '@/[^']*'" | sed "s/from '//;s/'$//" | sort -u | while IFS= read -r import_path; do
  resolved=$(echo "$import_path" | sed "s/@\//src\//")
  found=0
  for ext in .ts .tsx .js .jsx; do
    if [ -f "${resolved}${ext}" ]; then found=1; break; fi
  done
  if [ "$found" = "0" ]; then
    if [ -f "${resolved}/index.ts" ] || [ -f "${resolved}/index.tsx" ] || [ -d "${resolved}" ]; then
      found=1
    fi
  fi
  if [ "$found" = "0" ]; then
    echo "BROKEN: ${import_path} -> ${resolved}"
  fi
done
echo "Import check complete."
