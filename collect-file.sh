#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

WORKSPACE_ROOT="$(pwd)"
SRC="$WORKSPACE_ROOT/src"
OUT="$WORKSPACE_ROOT/collected-patch.txt"

echo "" > "$OUT"

cat >> "$OUT" << 'EOF'
# CCTV-SEKOLAH PATCH - Source Code Collection

---

EOF

# ------------------------------------------------
collect_file() {
    local file=$1
    if [ -f "$file" ]; then
        local rel="${file#$WORKSPACE_ROOT/}"
        local lines=$(wc -l < "$file" 2>/dev/null || echo "0")
        local ext="${file##*.}"

        echo -e "${GREEN}  ✓ ${NC}$rel ${CYAN}(${lines} lines)${NC}"

        cat >> "$OUT" << EOF

## \`$rel\`

**Lines:** $lines

\`\`\`$ext
$(cat "$file")
\`\`\`

---

EOF
    else
        echo -e "${RED}  ✗ SKIP${NC} ${YELLOW}(not found)${NC}: ${file#$WORKSPACE_ROOT/}"
    fi
}

section() {
    local icon=$1
    local label=$2
    echo ""
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${BLUE}${icon} ${label}${NC}"
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    cat >> "$OUT" << EOF

# ${icon} ${label}

EOF
}

# ================================================
section "📁" "APP ROOT"
collect_file "$SRC/app/layout.tsx"
collect_file "$SRC/app/page.tsx"
collect_file "$SRC/app/globals.css"
collect_file "$SRC/proxy.ts"

# ================================================
section "🔐" "AUTH"
collect_file "$SRC/app/(auth)/layout.tsx"
collect_file "$SRC/app/(auth)/login/page.tsx"
collect_file "$SRC/app/api/auth/callback/route.ts"
collect_file "$SRC/components/features/auth/index.ts"
collect_file "$SRC/components/features/auth/login-form.tsx"
collect_file "$SRC/components/features/auth/logout-button.tsx"
collect_file "$SRC/components/features/index.ts"
collect_file "$SRC/components/providers/auth-provider.tsx"
collect_file "$SRC/components/providers/index.ts"
collect_file "$SRC/stores/auth-store.ts"
collect_file "$SRC/stores/index.ts"

# ================================================
section "🏠" "DASHBOARD"
collect_file "$SRC/app/(dashboard)/layout.tsx"
collect_file "$SRC/app/(dashboard)/dashboard/page.tsx"
collect_file "$SRC/app/(dashboard)/overview/page.tsx"
collect_file "$SRC/app/(dashboard)/profile/page.tsx"
collect_file "$SRC/app/(dashboard)/settings/page.tsx"
collect_file "$SRC/app/(dashboard)/watch/page.tsx"

# ================================================
section "🛡️" "ADMIN PAGES"
collect_file "$SRC/app/(dashboard)/admin/page.tsx"
collect_file "$SRC/app/(dashboard)/admin/access/page.tsx"
collect_file "$SRC/app/(dashboard)/admin/access/access-form.tsx"
collect_file "$SRC/app/(dashboard)/admin/access/actions.ts"
collect_file "$SRC/app/(dashboard)/admin/cameras/page.tsx"
collect_file "$SRC/app/(dashboard)/admin/cameras/row-actions.tsx"
collect_file "$SRC/app/(dashboard)/admin/cameras/actions.ts"
collect_file "$SRC/app/(dashboard)/admin/cameras/new/page.tsx"
collect_file "$SRC/app/(dashboard)/admin/parents/page.tsx"
collect_file "$SRC/app/(dashboard)/admin/parents/row-actions.tsx"
collect_file "$SRC/app/(dashboard)/admin/parents/actions.ts"
collect_file "$SRC/app/(dashboard)/admin/parents/new/page.tsx"

# ================================================
section "📡" "API ROUTES"
collect_file "$SRC/app/api/stream/route.ts"

# ================================================
section "🎨" "LAYOUT COMPONENTS"
collect_file "$SRC/components/layout/index.ts"
collect_file "$SRC/components/layout/app-sidebar.tsx"
collect_file "$SRC/components/layout/header.tsx"
collect_file "$SRC/components/layout/mobile-nav.tsx"
collect_file "$SRC/components/layout/nav-config.ts"
collect_file "$SRC/components/layout/user-menu.tsx"

# ================================================
section "📹" "CCTV COMPONENTS"
collect_file "$SRC/components/features/cctv/index.ts"
collect_file "$SRC/components/features/cctv/camera-card.tsx"
collect_file "$SRC/components/features/cctv/camera-grid.tsx"
collect_file "$SRC/components/features/cctv/stream-player.tsx"
collect_file "$SRC/components/features/cctv/outside-hours-notice.tsx"

# ================================================
section "🔧" "SHARED COMPONENTS"
collect_file "$SRC/components/shared/index.ts"
collect_file "$SRC/components/shared/confirm-dialog.tsx"
collect_file "$SRC/components/shared/loading-spinner.tsx"
collect_file "$SRC/components/shared/offline-detector.tsx"

# ================================================
section "📚" "LIB & UTILS"
collect_file "$SRC/lib/supabase/client.ts"
collect_file "$SRC/lib/supabase/proxy.ts"
collect_file "$SRC/lib/supabase/middleware.ts"
collect_file "$SRC/lib/supabase/server.ts"
collect_file "$SRC/lib/supabase/admin.ts"
collect_file "$SRC/lib/tuya.ts"
collect_file "$SRC/lib/time.ts"
collect_file "$SRC/lib/utils.ts"
collect_file "$SRC/lib/validators.ts"

# ================================================
section "📝" "TYPES"
collect_file "$SRC/types/index.ts"
collect_file "$SRC/types/database.ts"

# ================================================
section "⚙️" "CONSTANTS"
collect_file "$SRC/constants/index.ts"
collect_file "$SRC/constants/routes.ts"

# ================================================
section "🎣" "HOOKS"
collect_file "$SRC/hooks/index.ts"
collect_file "$SRC/hooks/use-auth.ts"

# ================================================
echo ""
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}✅ DONE!${NC}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📄 Output : ${NC}$OUT"
echo -e "${CYAN}📝 Lines  : ${NC}$(wc -l < "$OUT")"
echo -e "${CYAN}📦 Size   : ${NC}$(du -h "$OUT" | cut -f1)"
echo -e "${YELLOW}⏭️  Skipped : components/ui/* (shadcn — diabaikan)${NC}"
echo ""