<!-- Language: ko -->
# COMMON_ERROR_RESOLUTIONS

### 1. Next.js Server Action 유효성 throw로 인한 RSC 500 크래시
- **현상**: `/admin` 퀵 액션 추가에서 커스텀 타입 입력이 잘못되면(`Laundry`, 빈값) 폼 에러 대신 `This page couldn’t load` + `POST /admin => 500` 발생.
- **원인**: Server Action 내부 유효성 검증이 `throw new Error(...)`를 사용해 RSC 렌더 단계 전체를 실패시킴.
- **해결**: 유효성 실패를 예외가 아닌 반환값(`{ success: false, error }`)으로 처리하고, 페이지에서 해당 메시지를 인라인 출력한다.

```ts
// ❌ 오류: 유효성 실패를 throw 처리
if (!/^[a-z][a-z0-9_]{0,63}$/.test(slug)) {
  throw new Error("커스텀 타입은 소문자 시작, 영문·숫자·밑줄만 사용할 수 있습니다.");
}

// ✅ 정석 해결: 실패 상태를 반환
if (!/^[a-z][a-z0-9_]{0,63}$/.test(slug)) {
  return { success: false, error: "커스텀 타입은 소문자 시작, 영문·숫자·밑줄만 사용할 수 있습니다." };
}
```

```ts
// ✅ 폼 액션에서 실패를 인라인 에러로 라우팅
const result = await createQuickAction(formData);
if (!result.success) {
  redirect(`/admin?quickActionError=${encodeURIComponent(result.error)}#quick-actions-admin`);
}
```

- **적용 파일**:
  - `app/actions/admin.ts`
  - `app/admin/page.tsx`
  - `tests/e2e/done-criteria.contract.test.mjs`

