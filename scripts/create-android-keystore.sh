#!/usr/bin/env bash
# Ourday — Android 릴리즈 키스토어 생성 스크립트
#
# ⚠️ 한 번만 실행. 분실 시 같은 패키지명(com.ourday.app)으로 스토어 재배포 영구 불가.
# 생성된 .jks는 1Password / 클라우드 암호화 폴더에 즉시 백업할 것.
#
# 사용:
#   bash scripts/create-android-keystore.sh
#
# 입력 (대화식):
#   - 키스토어 비밀번호 (8자 이상)
#   - 키 별칭 비밀번호 (보통 키스토어와 동일하게)
#   - 이름·조직·도시 등 (스토어 노출 안 됨, 자유 입력)

set -e

KEYSTORE_DIR="$(cd "$(dirname "$0")/.." && pwd)/android/app"
KEYSTORE_FILE="$KEYSTORE_DIR/ourday-release.jks"
KEY_ALIAS="ourday"
VALIDITY_DAYS=10000   # ~27년

if [ -f "$KEYSTORE_FILE" ]; then
  echo "❌ 이미 키스토어가 존재합니다: $KEYSTORE_FILE"
  echo "   덮어쓰면 기존 앱과 호환되지 않으므로 중단합니다."
  exit 1
fi

echo "── Ourday Android 릴리즈 키스토어 생성 ───────────────"
echo "위치: $KEYSTORE_FILE"
echo "별칭: $KEY_ALIAS"
echo "유효기간: $VALIDITY_DAYS일 (~27년)"
echo ""
echo "이제 keytool이 실행됩니다."
echo "  - 비밀번호는 8자 이상 (절대 잊지 말 것)"
echo "  - '이름과 성' 등은 자유 입력 (예: Ourday)"
echo ""
read -p "계속하려면 Enter, 취소는 Ctrl+C: "

keytool -genkey -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity "$VALIDITY_DAYS"

echo ""
echo "✅ 키스토어 생성 완료: $KEYSTORE_FILE"
echo ""
echo "── 다음 단계 ─────────────────────────────────────────"
echo "1. 즉시 백업:"
echo "   cp '$KEYSTORE_FILE' ~/secure-backup/   # 또는 1Password 첨부"
echo ""
echo "2. SHA-256 지문 추출 + assetlinks.json 갱신:"
echo "   bash scripts/update-assetlinks.sh"
echo ""
echo "3. android/app/keystore.properties 생성 (gitignored):"
echo "   storeFile=ourday-release.jks"
echo "   storePassword=<위에서 입력한 비밀번호>"
echo "   keyAlias=$KEY_ALIAS"
echo "   keyPassword=<별칭 비밀번호>"
