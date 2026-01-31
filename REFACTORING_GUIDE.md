# 리팩토링 가이드라인

## 핵심 원칙

> **함수명으로 코드 내용이 예측 가능해야 한다.**
>
> 함수명과 실제 코드의 괴리가 크면 버그의 온상이다.

---

## 예측 가능성 평가 기준

### 별점 (⭐ ~ ⭐⭐⭐⭐⭐)

| 별점 | 예측 가능성 | 기준 | 예시 |
|------|-----------|------|------|
| ⭐ | 매우 낮음 | 함수명과 전혀 다른 작업 수행 | `addCopyButton`이 이미지 변환까지 담당 |
| ⭐⭐ | 낮음 | 함수명으로 일부 예측만 가능 | `render`가 파싱/초기화/후처리까지 담당 |
| ⭐⭐⭐ | 중간 | 함수명으로 대략 예측 가능 | `renderWithPanZoom`이 wrapper/SVG/PanZoom 모두 처리 |
| ⭐⭐⭐⭐ | 높음 | 함수명으로 대부분 예측 가능 | `parseWidth`가 width 파싱만 담당 |
| ⭐⭐⭐⭐⭐ | 매우 높음 | 함수명으로 정확하게 예측 가능 | `extractSvgFromElement`가 SVG 추출만 담당 |

---

## 리팩토링 기준

### 1. 함수 길이

- **허용**: ≤ 30라인 (예측 가능성 ⭐⭐⭐⭐ 이상)
- **개선 권장**: 31-50라인 (예측 가능성 ⭐⭐⭐)
- **즉시 리팩토링**: > 50라인 (예측 가능성 ⭐⭐ 이하)

### 2. 단일 책임 원칙

- **각 함수는 하나의 작업만 수행해야 한다**
- 함수명으로 그 작업이 정확히 예측 가능해야 한다

### 3. 버그 추론 용이성

- 버그 발생 시 해당 함수로 바로 위치 추론 가능해야 한다
- 복수의 책임이 혼재된 함수는 버그 원인 추론이 불가능

---

## 작업 방식

### 1단계: 함수 분석

```typescript
// 분석 대상 함수
private addCopyButton(el: HTMLElement, backgroundColor: string): void {
  // 115라인
  // - 버튼 생성 (10라인)
  // - hover 이벤트 (8라인)
  // - SVG → PNG 변환 (97라인) ← 문제
  // - Canvas 렌더링
  // - Clipboard API
  // - 성공/실패 UI
}
```

**평가:**
- 함수명: `addCopyButton` → "복사 버튼 추가"
- 실제 작업: 버튼 추가 + 복잡한 이미지 변환
- **예측 가능성**: ⭐ (매우 낮음)
- **결론**: 즉시 리팩토링 필요

### 2단계: 작업 분리

```typescript
// 분리 계획
addCopyButton (115라인)
  ↓
  ├─ createCopyButtonElement()              // 버튼 생성
  ├─ setupCopyButtonEvents()               // 이벤트 연결
  │   └─ handleCopyClick()                 // 클릭 핸들러
  │       └─ copySvgToClipboard()           // 복사 메인
  │           ├─ extractSvgFromElement()   // SVG 추출
  │           ├─ convertSvgToDataUrl()    // SVG → URL
  │           ├─ renderSvgToCanvas()       // URL → Canvas
  │           └─ writeBlobToClipboard()  // Clipboard API
  │       └─ showCopyFeedback()           // UI 피드백
  └─ el.appendChild(button)               // DOM 추가
```

### 3단계: 함수 네이밍

**원칙:**
- 동사 + 명사
- 정확히 한 가지 작업을 설명
- 예측 가능성 ⭐⭐⭐⭐ 이상

**예시:**
- ✅ `extractSvgFromElement` - SVG 추출 (⭐⭐⭐⭐⭐)
- ✅ `convertSvgToDataUrl` - URL 변환 (⭐⭐⭐⭐⭐)
- ✅ `writeBlobToClipboard` - Clipboard API (⭐⭐⭐⭐⭐)
- ❌ `addCopyButton` (원래) - 버튼 추가 + 이미지 변환 (⭐)
- ❌ `render` (너무 광범위) - 렌더링 + 파싱 + 초기화 (⭐⭐)

### 4단계: 구현 순서

1. **상수 정의**: 반복되는 값 (아이콘, 메시지 등)
2. **하위 함수 구현**: 단순한 작업부터
3. **상위 함수 구현**: 하위 함수를 조합
4. **테스트**: 기능 유지 확인

---

## 실제 적용 사례

### Before: mermaid-renderer.ts (리팩토링 전)

```typescript
// 115라인, 예측 가능성 ⭐
private addCopyButton(el: HTMLElement, backgroundColor: string): void {
  // 버튼 생성
  const copyButton = document.createElement('button');
  // ... 10라인

  // hover 이벤트
  copyButton.addEventListener('mouseenter', () => { /* ... */ });
  // ... 8라인

  // SVG → PNG 변환 (복잡한 로직)
  copyButton.addEventListener('click', async () => {
    const svgElement = el.querySelector('svg');
    // SVG 추출
    // base64 변환
    // Canvas 렌더링
    // Clipboard API
    // 성공/실패 UI
    // ... 97라인
  });
}
```

**문제점:**
- 버그 발생 시 어디서 문제인지 추론 불가
- SVG 추출, Canvas 렌더링, Clipboard API가 한곳에 얽혀있음
- 함수명(`addCopyButton`)과 실제 코드의 괴리가 심각

---

### After: mermaid-renderer.ts (리팩토링 후)

```typescript
// 상수 정의
const COPY_ICON = `...`;
const SUCCESS_ICON = `...`;
const ERROR_ICON = `...`;

// 하위 함수 (5-15라인, 예측 가능성 ⭐⭐⭐⭐⭐)
private extractSvgFromElement(el: HTMLElement): SVGSVGElement | null {
  const svgElement = el.querySelector('svg') as SVGSVGElement;
  if (!svgElement) return null;
  svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return svgElement;
}

private convertSvgToDataUrl(svgElement: SVGSVGElement): string {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const base64Svg = btoa(unescape(encodeURIComponent(svgData)));
  return 'data:image/svg+xml;base64,' + base64Svg;
}

private writeBlobToClipboard(blob: Blob): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

// 중간 함수 (10-15라인, 예측 가능성 ⭐⭐⭐⭐)
private async copySvgToClipboard(el: HTMLElement, backgroundColor: string): Promise<void> {
  const svgElement = this.extractSvgFromElement(el);
  if (!svgElement) throw new Error('SVG element not found');
  const url = this.convertSvgToDataUrl(svgElement);
  const blob = await this.renderSvgToCanvas(url, svgElement, backgroundColor);
  await this.writeBlobToClipboard(blob);
}

// 상위 함수 (5라인, 예측 가능성 ⭐⭐⭐⭐⭐)
private addCopyButton(el: HTMLElement, backgroundColor: string): void {
  const button = this.createCopyButtonElement();
  this.setupCopyButtonEvents(button, el, backgroundColor);
  el.appendChild(button);
}
```

**개선점:**
- 각 함수명으로 정확히 작업 예측 가능
- 버그 발생 시 해당 함수로 바로 이동
- SVG 추출 문제 → `extractSvgFromElement`
- Canvas 렌더링 문제 → `renderSvgToCanvas`
- Clipboard API 문제 → `writeBlobToClipboard`

---

## 체크리스트

리팩토링 전/후 다음을 확인:

- [ ] 함수명으로 코드 내용 예측 가능 (⭐⭐⭐⭐ 이상)
- [ ] 함수 길이 ≤ 50라인
- [ ] 단일 책임 원칙 준수
- [ ] 버그 추론 용이성 확보
- [ ] 중복 코드 제거
- [ ] 상수 정의 (반복되는 값)
- [ ] 기능 테스트 완료

---

## 일반적인 안티패턴

### ❌ 안티패턴 1: 너무 광범위한 함수명

```typescript
// Bad
private process() { ... }  // 무엇을 처리?

// Good
private convertMarkdownToHtml() { ... }
```

### ❌ 안티패턴 2: 여러 작업 혼재

```typescript
// Bad
private addAndProcess() { ... }  // 추가 + 처리?

// Good
private add() { ... }
private process() { ... }
```

### ❌ 안티패턴 3: 함수명과 실제 동작 불일치

```typescript
// Bad
private fetchUser() {  // fetch만 하지 않음
  fetch(...);
  validate(...);
  save(...);
  sendNotification(...);
}

// Good
private fetchAndSaveUser() { ... }  // 또는 분리
```

---

## 요약

1. **함수명으로 코드 예측 가능** (⭐⭐⭐⭐ 이상)
2. **한 함수 = 한 작업** (단일 책임)
3. **버그 추론 용이** (해당 함수로 바로 이동)
4. **최대 함수 길이**: 50라인 (권장), 30라인 (이상)
5. **복잡한 함수 분리**: 하위 함수로 나누고 조합

이 가이드라인을 따르면 유지보수가 용이하고 버그 발생률이 낮아지는 코드를 작성할 수 있습니다.
