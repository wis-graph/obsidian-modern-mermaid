# Obsidian 플러그인 퍼블리시 가이드

이 가이드는 실제 시행착오를 바탕으로 작성된 옵시디언 플러그인 퍼블리시 방법입니다.

## 전제 조건

- GitHub 계정
- 완성된 Obsidian 플러그인 (테스트 완료)
- 플러그인 리포지토리

---

## 1단계: 플러그인 파일 준비

### 필수 파일 확인

```
your-plugin/
├── manifest.json      # 필수: 플러그인 메타데이터
├── main.js           # 필수: 번들된 자바스크립트
├── styles.css        # 선택사항: 스타일시트
├── README.md         # 필수: 문서
├── LICENSE           # 필수: 라이선스
└── versions.json     # 필수: 호환성 정보
```

### manifest.json 작성

```json
{
  "id": "unique-plugin-id",
  "name": "Plugin Name",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "Brief description WITHOUT 'Obsidian'",
  "author": "your-username",
  "authorUrl": "https://github.com/your-username",
  "isDesktopOnly": false
}
```

**⚠️ 중요:**
- `id`: 전체적으로 유일해야 함
- `version`: 반드시 `v` 접두사 없이 숫자만 (예: `1.0.0`이지 `v1.0.0` 아님)
- `description`: **"Obsidian" 단어를 포함하지 말 것** (검사 실패 원인)

### versions.json 작성

```json
{
  "1.0.0": "0.15.0"
}
```

### package.json 검토

```json
{
  "name": "obsidian-your-plugin-name",
  "description": "Accurate description",
  "author": "your-username",
  ...
}
```

**⚠️ 주의사항:**
- `name`은 플러그인 ID와 일치할 필요 없음
- 다른 플러그인 템플릿에서 복사했을 경우 이름/설명 확인 필요

### README.md 작성

```markdown
# Plugin Name

Clear description of what the plugin does.

## Features

- Feature 1
- Feature 2

## Usage

...

## Credits

Built with [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
```

**⚠️ 주의사항:**
- 제목과 설명이 manifest.json과 일치해야 함
- README 설명에서도 "Obsidian" 과도하게 사용하지 않기

---

## 2단계: 플러그인 빌드

```bash
# TypeScript 빌드 + esbuild 번들링
npm run build

# 빌드된 main.js 크기 확인 (너무 크면 문제일 수 있음)
ls -lh main.js
```

**문제 해결:**
- TypeScript 빌드 오류 발생 시 `tsconfig.json`에 `"skipLibCheck": true` 추가
- `@types/d3-dispatch` 같은 불필요한 의존성 제거

---

## 3단계: 파일 업로드 및 커밋

```bash
# 변경사항 스테이징
git add .

# 커밋
git commit -m "Release 1.0.0"

# 푸시
git push origin main
```

---

## 4단계: GitHub Release 생성

### 태그 생성

```bash
# ⚠️ v 접두사 없이 숫자만
git tag 1.0.0

# 태그 푸시
git push origin 1.0.0
```

**⚠️ 중요:**
- 태그는 반드시 `v` 접두사 없이 (예: `1.0.0`, NOT `v1.0.0`)
- 태그는 최신 커밋을 가리켜야 함

### GitHub CLI로 Release 생성

```bash
# 최신 파일로 Release 생성
gh release create 1.0.0 \
  manifest.json \
  main.js \
  styles.css \
  versions.json \
  LICENSE \
  --title "1.0.0" \
  --notes "Release notes here"
```

**⚠️ 필수 파일:**
- `manifest.json`: 필수
- `main.js`: 필수
- `styles.css`: 있으면 포함
- `versions.json`: 필수
- `LICENSE`: 필수

**웹에서 생성:**
1. GitHub 레포의 "Releases" 클릭
2. "Create a new release" 클릭
3. Choose tag: `1.0.0` (v 접두사 없이)
4. Release title: `1.0.0`
5. Description: 릴리스 노트
6. 파일 업로드: manifest.json, main.js, styles.css, versions.json, LICENSE
7. "Publish release" 클릭

---

## 5단계: community-plugins.json에 추가

### Obsidian Releases 레포 클론

```bash
# obsidian-releases 레포 클론
git clone https://github.com/obsidianmd/obsidian-releases.git
cd obsidian-releases

# 새 브랜치 생성
git checkout -b add-your-plugin-name
```

### community-plugins.json 수정

```json
{
  "id": "unique-plugin-id",
  "name": "Plugin Name",
  "author": "your-username",
  "description": "Same as manifest.json",
  "repo": "your-username/your-repo-name"
}
```

**⚠️ 주의사항:**
- `description`은 반드시 manifest.json의 설명과 정확히 일치해야 함
- "Obsidian" 단어 포함 금지
- 필드 순서: `id` → `name` → `author` → `description` → `repo`

### 수정사항 커밋 및 푸시

```bash
git add community-plugins.json
git commit -m "Add your-plugin-name"
git push origin add-your-plugin-name
```

---

## 6단계: Pull Request 생성

### GitHub에서 PR 생성

1. https://github.com/wis-graph/obsidian-releases/pull/new/add-your-plugin-name 접속
2. PR 템플릿 사용 (Community Plugin 선택)
3. 체크리스트 작성

### PR 템플릿 작성

```markdown
# I am submitting a new Community Plugin

- [x] I attest that I have done my best to deliver a high-quality plugin...

## Repo URL

Link to my plugin: https://github.com/your-username/your-repo

## Release Checklist
- [x] I have tested the plugin on
  - [x]  Windows
  - [x]  macOS
  - [x]  Linux
- [x] My GitHub release contains all required files
  - [x] `main.js`
  - [x] `manifest.json`
  - [x] `styles.css` _(optional)_
- [x] GitHub release name matches the exact version number
- [x] The `id` in my `manifest.json` matches the `id` in `community-plugins.json`
- [x] My README.md describes the plugin's purpose
- [x] I have read the developer policies
- [x] I have read the plugin guidelines
- [x] I have added a license
- [x] My project respects and is compatible with licenses
```

---

## 7단계: 검수 대기

### 자동 검사 확인

PR이 생성되면 자동 검사가 실행됩니다:

**일반적인 에러와 해결:**

1. **❌ You did not follow the pull request template**
   - 해결: PR 템플릿을 사용하고 체크리스트 완료

2. **❌ Please don't include `Obsidian` in the plugin description**
   - 해결: manifest.json, README.md, community-plugins.json에서 "Obsidian" 제거

3. **❌ Unable to find a release with the tag `1.0.0`**
   - 해결:
     - 태그 확인: `git tag` (v 접두사 없어야 함)
     - Release 존재 확인: `gh release view 1.0.0`
     - 필요시 다시 생성

4. **❌ Description mismatch**
   - 해결: community-plugins.json의 설명을 manifest.json과 일치시키기

### 검사 재실행

검사 오류가 발생하면:

```bash
# community-plugins.json 수정
git add community-plugins.json
git commit -m "Fix description"
git push origin add-your-plugin-name
```

PR 페이지에서 자동으로 검사가 다시 실행됩니다.

---

## 8단계: 승인 대기

- 검사 통과 후 Obsidian 팀이 수동 검토
- 보통 몇 일에서 일주일 소요
- 승인되면 커뮤니티 플러그인 목록에 추가

---

## 플러그인 업데이트 방법

업데이트는 간단합니다! community-plugins.json 수정 불필요.

### 업데이트 단계

1. **manifest.json 버전 업데이트**
   ```json
   {
     "version": "1.0.1",
     ...
   }
   ```

2. **versions.json에 새 버전 추가**
   ```json
   {
     "1.0.0": "0.15.0",
     "1.0.1": "0.15.0"
   }
   ```

3. **커밋 및 푸시**
   ```bash
   git add .
   git commit -m "Release 1.0.1"
   git push origin main
   ```

4. **새 태그 생성**
   ```bash
   git tag 1.0.1
   git push origin 1.0.1
   ```

5. **새 Release 생성**
   ```bash
   gh release create 1.0.1 \
     manifest.json \
     main.js \
     styles.css \
     versions.json \
     LICENSE \
     --title "1.0.1" \
     --notes "Release notes"
   ```

**완료!** Obsidian이 자동으로 새 Release를 감지합니다.

---

## 자주 발생하는 문제와 해결

### 1. TypeScript 빌드 오류

```json
// tsconfig.json
{
  "compilerOptions": {
    ...
    "skipLibCheck": true,
    ...
  }
}
```

### 2. main.js 크기 너무 큼

```bash
# esbuild 최적화 확인
node esbuild.config.mjs production

# 크기 확인
ls -lh main.js
```

### 3. 태그 충돌

```bash
# 기존 태그 삭제
git tag -d 1.0.0
git push origin :refs/tags/1.0.0

# 새 태그 생성
git tag 1.0.0
git push origin 1.0.0
```

### 4. Release 파일 오래됨

```bash
# Release 삭제
gh release delete 1.0.0 -y

# 새 Release 생성
gh release create 1.0.0 manifest.json main.js styles.css versions.json LICENSE
```

---

## 유용한 명령어

### Release 확인
```bash
gh release view 1.0.0
gh release view 1.0.0 --json assets
```

### 태그 확인
```bash
git tag
git show 1.0.0:manifest.json
```

### 커밋 기록 확인
```bash
git log --oneline -10
git log --graph --all
```

### 원격 확인
```bash
git remote -v
```

---

## 참고자료

- [Obsidian Plugin Publishing Guide](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- [Obsidian Developer Policies](https://docs.obsidian.md/Developer+policies)
- [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [obsidian-releases 레포](https://github.com/obsidianmd/obsidian-releases)

---

## 팁

- 테스트 충분히 하기 (Windows, macOS, Linux)
- 코드 퀄리티 높게 유지
- 문서 명확하게 작성
- 라이선스 포함
- 사용자 피드백 적극 반응
- 버전 충돌 방지 (Semantic Versioning 사용)
- Breaking changes는 메이저 버전 업
