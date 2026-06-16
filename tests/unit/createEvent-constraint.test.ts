import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("createEvent constraint handling", () => {
  it("try/catch로 db.transaction()을 감싸고 있다", () => {
    const eventsAction = read("app/actions/events.ts");
    expect(eventsAction).toMatch(/try\s*\{/);
    expect(eventsAction).toMatch(/catch\s*\(err\s*\)/);
  });

  it("constraint error detection이 error code 2067과 메시지 패턴을 모두 확인한다", () => {
    const eventsAction = read("app/actions/events.ts");
    expect(eventsAction).toMatch(/TURSO_CONSTRAINT_ERROR_CODE\s*=\s*"2067"/);
    expect(eventsAction).toMatch(/UNIQUE constraint/);
  });

  it("CreateEventResult 타입에 reason 필드가 포함되어 있다", () => {
    const eventsAction = read("app/actions/events.ts");
    expect(eventsAction).toMatch(/reason\?:\s*"duplicate"/);
  });

  it("constraint catch 시 lastEventAt 조회 쿼리가 포함되어 있다", () => {
    const eventsAction = read("app/actions/events.ts");
    expect(eventsAction).toMatch(/\.select\(\{.*createdAt.*events\.createdAt/);
    expect(eventsAction).toMatch(/\.orderBy\(desc\(/);
  });

  it("constraint catch 시 reason: 'duplicate'를 반환한다", () => {
    const eventsAction = read("app/actions/events.ts");
    expect(eventsAction).toMatch(/reason:\s*"duplicate"/);
  });

  it("RecordEventModal이 reason === 'duplicate'를 처리한다", () => {
    const recordModal = read("app/(dashboard)/RecordEventModal.tsx");
    expect(recordModal).toMatch(/result\.reason === "duplicate"/);
    expect(recordModal).toMatch(/이미 기록된 항목입니다/);
  });

  it("RecordEventModal CreateEventResult 타입에 reason 필드가 포함되어 있다", () => {
    const recordModal = read("app/(dashboard)/RecordEventModal.tsx");
    expect(recordModal).toMatch(/reason\?:\s*"duplicate"/);
  });

  it("duplicate 처리는 medication override prompt보다 먼저 실행된다", () => {
    const recordModal = read("app/(dashboard)/RecordEventModal.tsx");
    const duplicateIdx = recordModal.indexOf('result.reason === "duplicate"');
    const overrideIdx = recordModal.indexOf("shouldOverride");
    expect(duplicateIdx).toBeGreaterThan(-1);
    expect(overrideIdx).toBeGreaterThan(-1);
    expect(duplicateIdx).toBeLessThan(overrideIdx);
  });

  it("duplicate 시 모달을 닫고 onRecorded를 호출한다", () => {
    const recordModal = read("app/(dashboard)/RecordEventModal.tsx");
    const duplicateSection = recordModal.slice(
      recordModal.indexOf('result.reason === "duplicate"'),
      recordModal.indexOf('result.reason === "duplicate"') + 300
    );
    expect(duplicateSection).toMatch(/dialogRef\.current\?\.close\(\)/);
    expect(duplicateSection).toMatch(/onRecorded\(\)/);
  });

  it("duplicate 시 toast를 표시하고 true를 반환하여 성공으로 처리한다", () => {
    const recordModal = read("app/(dashboard)/RecordEventModal.tsx");
    const duplicateSection = recordModal.slice(
      recordModal.indexOf('result.reason === "duplicate"'),
      recordModal.indexOf('result.reason === "duplicate"') + 300
    );
    expect(duplicateSection).toMatch(/showToast\(/);
    expect(duplicateSection).toMatch(/return true/);
  });
});
