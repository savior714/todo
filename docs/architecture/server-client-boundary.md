# Server/Client Component Boundary Guidelines

## 원칙

Next.js App Router에서 server component와 client component의 경계를 명확히 하여,
불필요한 전환 오버헤드를 방지하고 유지보수성을 높인다.

## 규칙

### 1. Server Component 기본 원칙

- **기본은 server component** — 데이터 페칭, DB 쿼리, 시드링은 server component에서 수행
- **`async` 함수 또는 `db` 쿼리가 있으면 server component** — 이들을 client component에서 사용할 수 없음

### 2. Client Component 전환 조건

다음 조건 중 하나라도 충족하면 client component(`"use client"`)로 전환하거나
별도 client component로 분리해야 함:

- `useState`, `useEffect`, `useMemo` 등 React hook 사용
- 이벤트 핸들러(`onClick`, `onSubmit` 등) 필요
- 브라우저 API(`window`, `localStorage`) 접근
- client-side navigation (`useRouter`, `router.refresh()`)

### 3. 분리 패턴

server component가 client-side interactivity가 필요하면:

```tsx
// ServerComponent.tsx (server component)
import ClientUI from "./ClientUI";

export default async function ServerComponent() {
  const data = await fetchData(); // DB 쿼리 등
  
  return <ClientUI data={data} />; // 데이터만 전달
}
```

```tsx
// ClientUI.tsx (client component)
"use client";

import { useState } from "react";

export default function ClientUI({ data }: { data: any }) {
  const [expanded, setExpanded] = useState(false); // 상태 관리
  
  return (
    <div>
      <p>{data.content}</p>
      <button onClick={() => setExpanded(!expanded)}>더보기</button>
    </div>
  );
}
```

### 4. 금지 사항

- server component에 `"use client"` 추가 — `async` 함수, `db` 쿼리가 모두 에러남
- client component에서 직접 `db` 쿼리 — 보안상 위험하고 Next.js 제한사항 위반
- 불필요한 client component 전환 — performance overhead 발생

### 5. 검토 체크리스트

컴포넌트 생성/수정 시 다음을 확인:

- [ ] 데이터 페칭이 있으면 server component인가?
- [ ] 상태 관리/이벤트가 있으면 client component인가?
- [ ] server→client 데이터 전달은 props로만 이루어지는가?
- [ ] `"use client"`가 필요한 경우에만 사용하는가?

## 예시

### DailyPinBanner (Server) + DailyPinContent (Client)

```tsx
// DailyPinBanner.tsx — server component
import DailyPinContent from "./DailyPinContent";

export default async function DailyPinBanner({ familyId }) {
  const pin = await db.query... // DB 쿼리
  
  return <DailyPinContent pin={pin} />; // 데이터만 전달
}

// DailyPinContent.tsx — client component
"use client";

import { useState } from "react";

export default function DailyPinContent({ pin }) {
  const [expanded, setExpanded] = useState(false); // 상태 관리
  
  return (
    <div>
      <h3>{pin.title}</h3>
      <p className={expanded ? "" : "line-clamp-3"}>{pin.content}</p>
      <button onClick={() => setExpanded(!expanded)}>더보기</button>
    </div>
  );
}
```

## 참고

- Next.js Docs: [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- Next.js Docs: [Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
