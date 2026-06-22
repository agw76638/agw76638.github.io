---
title: '부트캠프 프로젝트 회고'
pubDate: 2026-06-22
description: '라운즈 리뉴얼'
lang: 'ko'
tags: ['a11y']
draft: false
---

## 들어가며 — 25초의 장벽

사용자가 모바일로 쇼핑몰에 접속했을 때, 화면에 상품이 뜨기까지 **25초**를 기다린다면 어떨까?

이번 부트캠프 팀 프로젝트에서 우리는 국내 선글라스 이커머스 플랫폼 **rounz.co.kr**을 분석 대상으로 선정됐다. 디자인도 깔끔하고, 상품 구성도 탄탄한 실제 운영 중인 서비스다. 그러나 Google PageSpeed Insights로 모바일 환경을 실측한 결과는 충격적이었다.

| 지표                         | 측정값          |
| ---------------------------- | --------------- |
| 성능 점수                    | **40 / 100** 🔴 |
| 접근성 점수                  | **62 / 100** 🟡 |
| 권장사항                     | 69 / 100 🟡     |
| 검색엔진 최적화              | 85 / 100 🟡     |
| **LCP (최대 콘텐츠 렌더링)** | **25.0초** 🔴   |
| FCP (첫 콘텐츠 렌더링)       | 5.4초 🔴        |
| Total Blocking Time          | 680ms 🔴        |
| CLS (레이아웃 변경)          | 0.006 ✅        |

성능 40점. LCP 25초. 이 숫자들은 단순히 "최적화가 부족하다"는 수준이 아니다.

사무실 고속 Wi-Fi 환경에서 개발하고 테스트하면 모든 것이 빠르게 느껴진다. 하지만 실제 사용자의 LTE 환경, 중저가 안드로이드 기기, 지하철 안의 약한 신호 — 이 현실 조건에서 사이트는 완전히 무너진다.

이 글은 그 원인을 기술적으로 해부하고, 우리 팀이 준비한 아키텍처적 해결책을 공유한다.

---

## Section 1. JavaScript 과부하 — 메인 스레드 기아 현상

성능 점수 40점의 핵심 원인은 자바스크립트다.

PageSpeed 진단 결과에서 발견된 수치들을 보자.

- **사용하지 않는 JavaScript: 1,046KiB** 삭제 가능
- **총 네트워크 페이로드: 45,554KiB (약 45.5MB)**
- **기본 스레드 작업 최소화 필요: 4.6초**
- **자바스크립트 실행 시간 단축 필요: 1.9초**

여기서 많은 개발자가 놓치는 핵심이 있다. JavaScript 최적화는 단순히 "파일 크기를 줄이는 것"이 아니다.

### 메인 스레드 기아(Main Thread Starvation)란?

브라우저에는 하나의 메인 스레드(Main Thread)가 있다. 이 스레드는 다음 모든 작업을 **순차적으로** 처리한다.

```
[JavaScript 파싱] → [컴파일] → [실행] → [스타일 계산] → [레이아웃] → [페인팅]
```

1,046KiB의 자바스크립트가 한꺼번에 로드되면, 메인 스레드는 이것을 **모두 파싱하고 컴파일하고 실행할 때까지** 다른 모든 작업을 멈춘다. 사용자에게는 그냥 "하얀 화면"이다.

이게 바로 TBT(Total Blocking Time) 680ms의 정체다. 사용자가 화면을 탭해도, 스크롤해도 — 브라우저는 아무 반응도 하지 못한다. 메인 스레드가 JavaScript 실행에 완전히 점유당해 있기 때문이다.

모바일 기기의 CPU는 데스크톱 대비 성능이 현저히 낮다. 동일한 JavaScript 번들이라도 모바일에서는 파싱·컴파일 시간이 **3~5배** 더 걸린다. 25초 LCP의 원인이 여기에 있다.

추가적으로 발견된 문제들:

- **렌더링 차단 요청** (예상 절감: 2,550ms)
- **효율적이지 않은 캐시 수명** (예상 절감: 44,520KiB)
- **이미지 전송 최적화 필요** (예상 절감: 28,916KiB)
- **레거시 JavaScript 사용** (예상 절감: 55KiB)

한 마디로, 번들 전략 없이 스크립트가 페이지에 투입되고 있는 상태다.

---

## Section 2. 접근성 62점 — 시맨틱 구조 붕괴

접근성은 "장애인을 위한 배려"가 아니다. **올바른 HTML 구조의 지표**다.

접근성 점수가 낮다는 것은 스크린 리더뿐 아니라 검색 엔진, 브라우저의 기본 파싱 엔진도 페이지 구조를 정확히 이해하지 못한다는 의미다.

rounz 사이트에서 발견된 접근성 문제들을 살펴보자.

### 이름 및 라벨 문제

- **이미지 요소에 `[alt]` 속성 없음**
- **`<frame>` 또는 `<iframe>` 요소에 제목 없음**
- **링크에 인식 가능한 이름 없음**

이 세 가지는 스크린 리더 사용자에게 치명적이다. 이미지가 무엇인지, 링크를 클릭하면 어디로 가는지 — 완전히 알 수 없는 상태가 된다.

### DOM 구조 오류

- **`<dl>` 요소 내에 올바른 `<dt>/<dd>` 구조 없음**
- **`<li>` 요소가 `<ul>` 또는 `<ol>` 부모 없이 단독 존재**
- **`<ul>` 안에 `<li>`와 스크립트 지원 요소만 포함되어 있지 않음**

이는 단순한 마크업 실수처럼 보이지만, 결과는 심각하다. AT(보조 기술, Assistive Technology)는 이 깨진 DOM 트리를 순회하면서 콘텐츠의 맥락을 완전히 잃는다. 스위치 컨트롤, 키보드 내비게이션, 음성 제어 — 이 모든 것이 작동하지 않는다.

### 대비 문제

- **배경과 전경의 색상 대비율 부족**

작은 텍스트에 대한 WCAG 기준은 4.5:1 이상이다. 이 기준을 충족하지 못하면 시력이 낮은 사용자, 혹은 직사광선 아래서 스마트폰을 보는 일반 사용자도 텍스트를 읽기 어렵다.

### 권장사항 위반

- **viewport 메타태그에 `user-scalable="no"` 또는 `maximum-scale` 값이 5 미만**
- **문서에 주요 랜드마크(`<main>`, `<nav>`, `<header>`, `<footer>`) 없음**

`user-scalable="no"`는 사용자가 화면을 확대하지 못하게 막는다. 이것은 단순히 권장사항 위반이 아니라, **접근성 침해**다.

62점은 숫자가 아니라, 전체 사용자의 상당 비율이 이 사이트를 제대로 사용할 수 없다는 신호다.

---

## Section 3. 아키텍처 대안 — 우리가 설계한 해결책

비판만으로는 아무것도 바뀌지 않는다. 팀 프로젝트에서 우리는 이 문제들을 직접 해결한 프레임워크 템플릿을 사전 설계했고, 그 결과를 실측했다.

### 성능 비교 (실측 데이터)

| 지표                 | rounz 현황    | 우리 웹사이트 | 개선율     |
| -------------------- | ------------- | ------------- | ---------- |
| 성능 점수            | **40** 🔴     | **100** ✅    | +147%      |
| 접근성               | **62** 🟡     | **100** ✅    | +61%       |
| 권장사항             | 69 🟡         | **100** ✅    | +45%       |
| SEO                  | 85 🟡         | **100** ✅    | +18%       |
| **LCP**              | **25.0초** 🔴 | **1.2초** ✅  | **22.7배** |
| FCP                  | 5.4초 🔴      | 1.2초 ✅      | 4.9배      |
| TBT                  | **680ms** 🔴  | **0ms** ✅    | —          |
| CLS                  | 0.006 ✅      | 0 ✅          | —          |
| 총 네트워크 페이로드 | **45,554KiB** | **130KiB**    | **601배**  |

> 측정 환경: Moto G Power 에뮬레이션, 느린 4G 제한, Lighthouse 13.3.0, 2026년 6월 11일 오전 4:31 (GMT+9)

601배의 페이로드 차이. LCP는 22.7배 빠르다. 어떻게 이게 가능할까?

### 핵심 1. Vite 멀티 엔트리 빌드 — 진짜 코드 스플리팅

많은 프로젝트가 "코드 스플리팅을 한다"고 하면서 실제로는 하나의 번들을 동적으로 `import()`하는 방식을 쓴다. 우리는 처음부터 **페이지 단위로 엔트리를 분리**하는 방식을 선택했다.

```javascript
// vite.config.js
export default defineConfig({
  base: '/est_fe13_2nd_project/',
  build: {
    rolldownOptions: {
      input: {
        main: resolve(__dirname, 'index.html'), // 메인 페이지
        notFound: resolve(__dirname, '404.html'), // 404 페이지
      },
    },
  },
});
```

각 HTML 파일은 자신에게 필요한 JS 엔트리만 명시적으로 참조한다.

```javascript
// src/js/pages/index.js — 메인 페이지 전용
import 'modern-normalize';
import '../../css/style.css';
import { renderHeader } from '../modules/header.js';
import Swiper from 'swiper';
import '../../css/pages/index.css';
// ... 메인 페이지에 필요한 것들만

// src/js/pages/404.js — 404 페이지 전용
import 'modern-normalize';
import '../../css/style.css';
import { renderHeader } from '../modules/header.js';
import '../../css/pages/404.css';
// Swiper? 필요 없다. 가져오지 않는다.
```

Vite는 이 구조를 빌드 시점에 분석해서 각 페이지에 필요한 청크만 생성한다. 404 페이지 방문자에게 Swiper 라이브러리를 다운로드시킬 이유가 없다.

이 방식의 부수 효과로 브라우저의 **네이티브 프리로드 스캐너**가 제 역할을 하게 된다. 단일 `bundle.js` 안에 모든 것이 숨겨져 있으면, 스캐너는 JS 실행 전까지 CSS나 이미지 리소스의 존재 자체를 모른다. 페이지별 명시적 엔트리는 HTML 파싱 단계부터 CSSOM과 DOM 빌드를 **병렬로** 진행할 수 있게 해준다.

---

### 핵심 2. 이미지 리소스 힌팅 — LCP 타겟을 브라우저에게 알려주기

LCP 25초의 직접적인 원인 중 하나는 브라우저가 "어떤 이미지가 가장 중요한지" 모르는 것이다. 우리는 히어로 슬라이더의 첫 번째 이미지에 `fetchpriority="high"`를 명시했다.

```html
<!-- index.html -->
<div class="swiper-wrapper">
  <!-- 첫 번째 슬라이드 — LCP 타겟 -->
  <div class="swiper-slide">
    <img
      class="hero__image-1"
      src="/images/2.webp"
      alt=""
      fetchpriority="high"   <!-- 브라우저에게: 이게 제일 중요해 -->
    >
  </div>
  <!-- 나머지 슬라이드 — 나중에 필요할 때 로드 -->
  <div class="swiper-slide">
    <img src="/images/3.webp" alt="" loading="lazy">
  </div>
  <div class="swiper-slide">
    <img src="/images/4.webp" alt="" loading="lazy">
  </div>
</div>
```

동시에 브랜드 배경 이미지는 `srcset`으로 반응형 처리했다.

```html
<img
  src="/images/main-brand-bg.webp"
  alt=""
  loading="lazy"
  srcset="
    /images/main-brand-bg-480.webp  480w,
    /images/main-brand-bg-768.webp  768w,
    /images/main-brand-bg.webp     1200w
  " />
```

모바일 사용자에게 1200w 이미지를 전송하는 것은 데스크톱 편향의 대표적인 사례다. `srcset`은 브라우저가 현재 뷰포트에 맞는 이미지를 스스로 선택하게 해준다.

---

### 핵심 3. 외부 리소스 최소화 하기

보통 웹사이트를 만들면 웹폰트도 사용하고 아이콘팩도 불러온다. 하지만 그러면 브라우저가 추가로 다운로드해야 하는 요소가 생긴다. 특히 한글 폰트는 알파벳 폰트보다 용량이 훨씬 크다. 그래서 `system-ui`폰트를 선택했다. 시스템에 설정된 폰트를 사용한는 것인데 시스템 기본 폰트들도 충분히 좋은 폰트들이라고 생각한다.

아이콘도 material icon 같은것을 cdn으로 불러오게 되면 많은 리소스를 차지한다. 그래서 인라인 SVG를 사용하기로 했다. 인라인 SVG는 추가 리소스가 전혀 발생하지 않는다. 오히려 커스텀 하기에는 더 좋다. 아이콘 폰트는 로딩이 실패할 수도 있지만 SVG는 가능성이 훨씬 낮다. Lucide에서 직접 SVG를 복사해서 사용하는 방법을 선택했다.

---

### 핵심 4. 접근성은 별도 레이어가 아니다 — 구조 자체에 내재화

접근성 100점은 별도의 "접근성 작업"을 따로 한 결과가 아니다. 처음부터 올바른 구조로 작성한 결과다.

**섹션 레이블링 — `aria-labelledby`**

```html
<!-- index.html -->
<section class="hero" aria-labelledby="hero-heading">
  <h1 id="hero-heading">ROUNZ — 세상을 다르게 보는 방법</h1>
</section>

<section class="info" aria-labelledby="info-heading">
  <h2 id="info-heading">안내</h2>
</section>
```

스크린 리더는 섹션에 진입할 때 레이블을 읽어준다. `aria-labelledby`는 이미 화면에 보이는 제목을 재사용하므로 중복 없이 컨텍스트를 전달한다.

**네비게이션 상태 관리 — `aria-expanded`와 `inert`**

모바일 햄버거 메뉴는 접근성에서 가장 놓치기 쉬운 영역이다. 우리는 두 가지를 명시적으로 구현했다.

```javascript
// src/js/modules/header.js
function showNavigationContent() {
  navButton.setAttribute('aria-expanded', 'true'); // 상태를 AT에 알림
  removeNavInert(); // 메뉴 콘텐츠: 포커스 가능하게
  makePageInert(); // 메인 콘텐츠: 포커스 불가능하게
  navCloseBtn.focus(); // 포커스를 메뉴 안으로 이동
}

function hideNav() {
  navButton.setAttribute('aria-expanded', 'false');
  makeNavInert(); // 메뉴 콘텐츠: 다시 포커스 트랩
  removePageInert(); // 메인 콘텐츠: 포커스 복원
}
```

`inert` 속성은 요소를 포커스 트리에서 완전히 제거한다. 메뉴가 닫혀 있을 때 탭 키로 메뉴 내부 링크에 도달하는 것을 원천 차단한다. 단순히 `display: none`을 쓰는 것보다 훨씬 정확한 접근성 처리다.

**탭 컴포넌트 — ARIA 패턴 완전 구현**

```javascript
// src/js/modules/tabs.js — 초기화 시
tabButtons.forEach((tab, index) => {
  if (index === 0) {
    tab.setAttribute('aria-selected', true); // 활성 탭 상태
  } else {
    tab.setAttribute('tabindex', '-1'); // 비활성 탭: 탭키 순서 제외
    tabPanels[index].setAttribute('hidden', '');
  }
});

// 키보드 내비게이션: 방향키로 탭 이동
tabsContainer.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowLeft':
      moveLeft();
      break;
    case 'ArrowRight':
      moveRight();
      break;
    case 'Home':
      switchTab(tabButtons[0]);
      break;
    case 'End':
      switchTab(tabButtons[tabButtons.length - 1]);
      break;
  }
});
```

WAI-ARIA Authoring Practices Guide의 탭 패턴을 그대로 구현했다. 방향키 탭 이동, `Home`/`End` 키 지원, `aria-selected` 상태 관리. 키보드만으로 사이트를 사용하는 사람도 탭 UI를 완전히 조작할 수 있다.

**아이콘 — 장식과 의미의 분리**

```javascript
// header.js — 아이콘은 시각적 장식, 의미는 visually-hidden <span>으로 전달
`<button aria-label="메뉴 열기">
  <svg aria-hidden="true"></svg>
  <span class="visually-hidden">메뉴 열기</span>
</button>
```

`aria-hidden="true"`로 아이콘을 접근성 트리에서 제외하고, 버튼/링크에 accName을 부여한다. 스크린 리더는 "메뉴 아이콘 버튼"이 아닌 "메뉴 열기 버튼"이라고 읽는다.

---

## 마치며

rounz.co.kr은 나쁜 서비스가 아니다. 오히려 잘 운영되고 있는 실제 이커머스 플랫폼이다. 이 분석의 목적은 비판이 아니라, 실제 프로덕션 환경에서 흔히 발생하는 기술적 부채를 구체적인 데이터로 살펴보는 것이었다.

25초의 LCP는 고칠 수 없는 문제가 아니다. 아키텍처적 결정 하나하나가 쌓여 만들어진 결과이고, 아키텍처적 결정으로 되돌릴 수 있다.

---

_이 분석은 부트캠프 팀 프로젝트의 일환으로 작성되었으며, Google PageSpeed Insights의 실측 데이터를 기반으로 합니다. rounz 측정: Moto G Power 에뮬레이션, Lighthouse 13.3.0, 2026년 6월 19일. 프레임워크 측정: 동일 환경, 느린 4G 제한, 2026년 6월 19일 12:21:17 AM ([링크 확인하기](https://pagespeed.web.dev/analysis/https-agw76638-github-io-est_fe13_2nd_project/6mw36hvq0k?form_factor=mobile))._
