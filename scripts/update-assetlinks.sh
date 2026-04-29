#!/usr/bin/env bash
# Ourday — 키스토어에서 SHA-256 지문 추출 → assetlinks.json 자동 갱신
#
# 키스토어 생성 후 실행. 비밀번호 입력 1회 필요.
#
# 사용:
#   bash scripts/update-assetlinks.sh

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEYSTORE_FILE="$REPO_ROOT/android/app/ourday-release.jks"
ASSETLINKS_FILE="$REPO_ROOT/public/.well-known/assetlinks.json"
KEY_ALIAS="ourday"

if [ ! -f "$KEYSTORE_FILE" ]; then
  echo "❌ 키스토어 없음: $KEYSTORE_FILE"
  echo "   먼저 bash scripts/create-android-keystore.sh 실행"
  exit 1
fi

echo "키스토어 비밀번호를 입력하세요:"
SHA256=$(keytool -list -v -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" 2>/dev/null \
  | grep -A1 "SHA256:" | head -1 | awk -F'SHA256: ' '{print $2}' | tr -d ' \r\n')

if [ -z "$SHA256" ]; then
  echo "❌ SHA-256 추출 실패 — 비밀번호 확인"
  exit 1
fi

echo "추출된 SHA-256: $SHA256"

# assetlinks.json에 두 지문(디버그 + 릴리즈) 모두 등록
cat > "$ASSETLINKS_FILE" <<EOF
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.ourday.app",
      "sha256_cert_fingerprints": [
        "D6:4A:2F:E4:79:7A:C6:03:4C:96:E6:25:A5:5D:39:43:D7:C7:F3:F9:CB:24:96:52:4E:E8:BD:98:19:E0:40:C7",
        "$SHA256"
      ]
    }
  }
]
EOF

echo "✅ $ASSETLINKS_FILE 갱신 완료"
echo ""
echo "── 다음 단계 ─────────────────────────────────────────"
echo "1. git add public/.well-known/assetlinks.json"
echo "2. git commit -m 'chore: assetlinks.json 프로덕션 SHA-256 추가'"
echo "3. git push origin main → Vercel 배포 → App Link 활성화"
