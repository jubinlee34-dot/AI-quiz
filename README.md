# AI 프롬프트 퀴즈

같은 원본 자료에 초급/중급 프롬프트를 적용했을 때 결과가 어떻게 달라지는지 비교하는 학습용 퀴즈 앱입니다.
프롬프트의 빈칸을 드래그 앤 드롭으로 채우면 결과를 확인할 수 있습니다.

- **초급**: 원본 → 프롬프트 → 결과를 처음부터 모두 공개. 원본과 결과를 비교하며 프롬프트를 복원합니다.
- **중급**: 결과가 잠겨 있고, 프롬프트를 모두 완성해야 결과가 공개됩니다.

현재 문제팩: **v1 (초급 7문제 + 중급 7문제)**

---

## 실행 방법

**반드시 로컬 서버로 실행해야 합니다.** `index.html`을 더블클릭해서 `file://`로 열면
브라우저 보안 정책 때문에 `questions.json`을 읽지 못해 문제가 표시되지 않습니다.

```bash
npx --yes serve . -l 5174
```

실행 후 브라우저에서 `http://localhost:5174` 접속.

---

## 폴더 구조

```text
AI-quiz/
├─ index.html          화면 구조
├─ style.css           디자인
├─ script.js           퀴즈 엔진 (드래그앤드롭, 정답 판정, 결과 공개)
├─ questions.json      ★ 문제 데이터 (이 파일만 고치면 문제가 바뀝니다)
└─ quiz-assets/
   └─ image/           ★ 이미지 파일 (원본-01.png, 결과-01-초급.png ...)
```

★ 표시된 두 곳만 관리하면 됩니다. **HTML/CSS/JS 코드는 수정할 필요가 없습니다.**

---

## 문제 관리 방법

### 문제 추가
`questions.json`의 `items` 배열에 문제 객체를 하나 추가합니다.
문제 개수는 자동으로 계산되므로 "문제 1 / 7" 같은 표시도 알아서 바뀝니다.

### 문제 수정 / 삭제
해당 문제 객체만 고치거나 지우면 됩니다.

### 이미지 추가 / 교체
`quiz-assets/image/` 폴더에 파일을 넣고, JSON의 `src`에 파일명을 적습니다.
이미지는 이 폴더에 **평면으로(하위 폴더 없이)** 저장하며, 경로는 파일명 기준으로 해석되므로
`src`에 `images/원본-01.png`라고 적어도 `quiz-assets/image/원본-01.png`를 찾아갑니다.
같은 파일명으로 덮어쓰면 JSON을 고치지 않아도 이미지가 교체됩니다.

---

## 문제 데이터 구조

```json
{
  "id": "q01",
  "sourceId": "img-dessert-01",
  "order": 1,
  "category": "이미지",
  "title": "꼬막녹차케이크",
  "difficulty": "초급",

  "original": { "type": "image", "src": "images/원본-01.png", "alt": "원본 사진" },

  "prompt": {
    "template": "이 디저트 사진을 [①] 보정해 주세요. 전체 분위기는 [②] 보이게 해 주세요.",
    "slots": [
      { "id": "s1", "label": "1", "answer": "밝게" },
      { "id": "s2", "label": "2", "answer": "따뜻하게" }
    ],
    "distractorBlocks": ["어둡게", "차갑게"]
  },

  "result": { "type": "image", "src": "images/결과-01-초급.png", "summary": "밝기·색감만 보정됨." },

  "learningPoint": "바꿀 것과 유지할 것을 함께 지정해야 합니다."
}
```

### 주요 규칙

| 항목 | 설명 |
|---|---|
| `difficulty` | `"초급"` 또는 `"중급"`. 결과 잠금 여부가 여기서 결정됩니다. |
| `sourceId` | 같은 원본을 쓰는 초급/중급 문제를 묶는 키. 짝이 되는 문제는 같은 값을 씁니다. |
| `order` | 문제 표시 순서. |
| `template` | `[①]`~`[⑤]` 자리표시자가 `slots` 순서대로 빈칸이 됩니다. |
| `slots[].answer` | 정답 블록의 문구. 판정은 텍스트가 아니라 **slot의 `id` 기준**입니다. |
| `distractorBlocks` | 오답 블록 문구 목록. |

### 지원 자료 유형

- **원본(`original.type`)**: `image` · `text`(title, content) · `table`(title, unit, headers, rows)
- **결과(`result.type`)**: `image`(+summary) · `text` · `bullets` · `table`(+notes) · `cardnews`

`table`의 `notes`는 표 아래에 붙는 분석 문장 목록이고,
`cardnews`의 `cards`는 `{ page, title, content }` 객체 배열입니다.

---

## 참고

- 문제팩 원본 문서: `AI_프롬프트_퀴즈_문제팩_v1_JSON형.docx`
- `questions.json`의 `discussionQuestions`는 수업 마무리 토의용 질문으로, 데이터에만 보관되며 화면에는 표시되지 않습니다.
