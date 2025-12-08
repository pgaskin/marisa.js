import eslint from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import compat from "eslint-plugin-compat"

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  compat.configs["flat/recommended"],
  globalIgnores(["dist/*"])
)
