#!/bin/bash

# SharePoint Token Refresh Monitor
# Real-time tracking van OAuth token requests voor SharePoint troubleshooting

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         SharePoint Token Refresh Monitor - v1.0               ║"
echo "║         Real-time OAuth Token Request Tracking                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOKEN_COUNT=0
ERROR_COUNT=0
START_TIME=$(date +%s)
LAST_TOKEN_TIME=0

# Thresholds
WARNING_INTERVAL=10  # Warn if tokens < 10 sec apart
CRITICAL_INTERVAL=5  # Critical if tokens < 5 sec apart

echo -e "${BLUE}⏱️  Monitoring started at $(date '+%H:%M:%S')${NC}"
echo -e "${BLUE}📊 Press Ctrl+C to stop and see summary${NC}"
echo ""
echo "┌─────────┬────────────────────────────────────────────────────────────┐"
echo "│  Time   │  Event Type                                                │"
echo "├─────────┼────────────────────────────────────────────────────────────┤"

# Function to calculate time diff
calc_time_diff() {
    local current_time=$(date +%s)
    if [ $LAST_TOKEN_TIME -ne 0 ]; then
        echo $((current_time - LAST_TOKEN_TIME))
    else
        echo 0
    fi
    LAST_TOKEN_TIME=$current_time
}

# Trap Ctrl+C to show summary
trap 'show_summary' INT

show_summary() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    
    echo "└─────────┴────────────────────────────────────────────────────────────┘"
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    MONITORING SUMMARY                          ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${BLUE}📊 Statistics:${NC}"
    echo "   Duration: ${duration} seconds"
    echo "   Token requests: ${TOKEN_COUNT}"
    echo "   Errors: ${ERROR_COUNT}"
    
    if [ $TOKEN_COUNT -gt 0 ] && [ $duration -gt 0 ]; then
        local avg_interval=$((duration / TOKEN_COUNT))
        echo "   Average interval: ${avg_interval} seconds"
        
        echo ""
        echo -e "${BLUE}🎯 Diagnosis:${NC}"
        if [ $avg_interval -lt $CRITICAL_INTERVAL ]; then
            echo -e "   ${RED}❌ CRITICAL: Token refresh loop detected!${NC}"
            echo -e "   ${RED}   Tokens requested every ~${avg_interval} seconds${NC}"
            echo -e "   ${YELLOW}   → Check: OPENID_AUDIENCE configuration${NC}"
            echo -e "   ${YELLOW}   → Check: Azure email claim present${NC}"
            echo -e "   ${YELLOW}   → Check: Application ID URI set${NC}"
        elif [ $avg_interval -lt $WARNING_INTERVAL ]; then
            echo -e "   ${YELLOW}⚠️  WARNING: Frequent token refreshes${NC}"
            echo -e "   ${YELLOW}   Tokens requested every ~${avg_interval} seconds${NC}"
            echo -e "   ${YELLOW}   → Review: OBO flow configuration${NC}"
        else
            echo -e "   ${GREEN}✅ HEALTHY: Normal token refresh pattern${NC}"
            echo -e "   ${GREEN}   Tokens requested every ~${avg_interval} seconds${NC}"
        fi
    fi
    
    echo ""
    echo "Monitor stopped at $(date '+%H:%M:%S')"
    exit 0
}

# Main monitoring loop
docker logs LibreChat -f --since 0s 2>&1 | while read -r line; do
    TIMESTAMP=$(date '+%H:%M:%S')
    
    # Token requests
    if echo "$line" | grep -q "oauth2/v2.0/token"; then
        TOKEN_COUNT=$((TOKEN_COUNT + 1))
        TIME_DIFF=$(calc_time_diff)
        
        if [ $TIME_DIFF -gt 0 ]; then
            if [ $TIME_DIFF -lt $CRITICAL_INTERVAL ]; then
                echo -e "│ ${RED}$TIMESTAMP${NC} │ ${RED}🚨 Token request #$TOKEN_COUNT (+${TIME_DIFF}s) CRITICAL!${NC}     │"
            elif [ $TIME_DIFF -lt $WARNING_INTERVAL ]; then
                echo -e "│ ${YELLOW}$TIMESTAMP${NC} │ ${YELLOW}⚠️  Token request #$TOKEN_COUNT (+${TIME_DIFF}s)${NC}              │"
            else
                echo -e "│ ${GREEN}$TIMESTAMP${NC} │ ${GREEN}✓ Token request #$TOKEN_COUNT (+${TIME_DIFF}s)${NC}               │"
            fi
        else
            echo -e "│ ${BLUE}$TIMESTAMP${NC} │ ${BLUE}🔑 Token request #$TOKEN_COUNT (first)${NC}                │"
        fi
    fi
    
    # Login success
    if echo "$line" | grep -q "login success openidId"; then
        echo -e "│ ${GREEN}$TIMESTAMP${NC} │ ${GREEN}✅ Login successful${NC}                                   │"
    fi
    
    # Errors
    if echo "$line" | grep -iq "error.*token\|error.*oauth"; then
        ERROR_COUNT=$((ERROR_COUNT + 1))
        ERROR_MSG=$(echo "$line" | grep -oP 'error.*' | cut -c1-50)
        echo -e "│ ${RED}$TIMESTAMP${NC} │ ${RED}❌ Error: ${ERROR_MSG}${NC}│"
    fi
    
    # OBO flow
    if echo "$line" | grep -q "On-Behalf-Of\|OBO flow"; then
        echo -e "│ ${BLUE}$TIMESTAMP${NC} │ ${BLUE}🔄 OBO flow initiated${NC}                             │"
    fi
    
    # SharePoint access
    if echo "$line" | grep -iq "sharepoint\|graph.*files"; then
        echo -e "│ ${GREEN}$TIMESTAMP${NC} │ ${GREEN}📁 SharePoint access attempt${NC}                       │"
    fi
    
    # Graph API token
    if echo "$line" | grep -q "Graph API token"; then
        echo -e "│ ${GREEN}$TIMESTAMP${NC} │ ${GREEN}🎫 Graph API token acquired${NC}                        │"
    fi
done
