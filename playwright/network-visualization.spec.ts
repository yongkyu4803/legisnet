import { test, expect } from '@playwright/test';

test.describe('Network Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002');
  });

  test('should display welcome message when no member is selected', async ({ page }) => {
    await expect(page.locator('h2:has-text("LegisNet")')).toBeVisible();
    await expect(page.locator('text=상단 검색창에서 분석하고 싶은 국회의원을 검색하세요')).toBeVisible();
  });

  test('should search and select a member', async ({ page }) => {
    // 검색창 찾기
    const searchInput = page.locator('input[placeholder*="의원 이름"]');
    await expect(searchInput).toBeVisible();

    // 의원 검색 (강경숙 의원 검색 - 데이터베이스에 확실히 존재)
    await searchInput.fill('강경숙');
    await page.waitForTimeout(1500); // 검색 결과 로딩 대기

    // 검색 결과에서 첫 번째 의원 선택
    const firstResult = page.locator('[class*="cursor-pointer"][class*="border-b"]').first();
    await expect(firstResult).toBeVisible({ timeout: 5000 });
    await firstResult.click();

    // 네트워크 로딩 대기
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // 네트워크가 표시되는지 확인
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  test('should exclude nodes with 0 values and verify direction filtering', async ({ page }) => {
    // 검색창에서 강경숙 의원 선택 (데이터베이스에 확실히 존재)
    const searchInput = page.locator('input[placeholder*="의원 이름"]');
    await searchInput.fill('강경숙');
    await page.waitForTimeout(1500);

    const firstResult = page.locator('[class*="cursor-pointer"][class*="border-b"]').first();
    await expect(firstResult).toBeVisible({ timeout: 5000 });
    await firstResult.click();

    // 네트워크 로딩 대기
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // 1. 전체(both) 모드에서 0값 노드가 없는지 확인
    const allBadges = page.locator('.react-flow [class*="bg-blue-600"]');
    await expect(allBadges.first()).toBeVisible({ timeout: 8000 });

    const badgeTexts = await allBadges.allTextContents();
    console.log('Badge values in "both" mode:', badgeTexts);

    // 모든 뱃지가 0이 아닌 값을 가져야 함
    for (const badgeText of badgeTexts) {
      const value = parseInt(badgeText.trim());
      expect(value).toBeGreaterThan(0);
    }
    expect(badgeTexts.length).toBeGreaterThan(0);

    // 2. "받은 것" 모드로 변경
    await page.locator('button:has-text("받은 것")').click();
    await page.waitForTimeout(1500);

    const receivedBadges = page.locator('.react-flow [class*="bg-green-600"]');
    await expect(receivedBadges.first()).toBeVisible({ timeout: 5000 });

    const receivedTexts = await receivedBadges.allTextContents();
    console.log('Badge values in "received" mode:', receivedTexts);

    // "받은 것" 모드에서도 0값 뱃지가 없어야 함
    for (const badgeText of receivedTexts) {
      const value = parseInt(badgeText.trim());
      expect(value).toBeGreaterThan(0);
    }
    expect(receivedTexts.length).toBeGreaterThan(0);

    // 3. "준 것" 모드로 변경
    await page.locator('button:has-text("준 것")').click();
    await page.waitForTimeout(1500);

    const givenBadges = page.locator('.react-flow [class*="bg-orange-600"]');
    await expect(givenBadges.first()).toBeVisible({ timeout: 5000 });

    const givenTexts = await givenBadges.allTextContents();
    console.log('Badge values in "given" mode:', givenTexts);

    // "준 것" 모드에서도 0값 뱃지가 없어야 함
    for (const badgeText of givenTexts) {
      const value = parseInt(badgeText.trim());
      expect(value).toBeGreaterThan(0);
    }
    expect(givenTexts.length).toBeGreaterThan(0);

    // 4. 다시 "전체" 모드로 돌아가기
    await page.locator('button:has-text("전체")').click();
    await page.waitForTimeout(1500);

    const finalBadges = page.locator('.react-flow [class*="bg-blue-600"]');
    await expect(finalBadges.first()).toBeVisible({ timeout: 5000 });

    const finalTexts = await finalBadges.allTextContents();
    console.log('Badge values back in "both" mode:', finalTexts);

    // 전체 모드에서도 여전히 0값 뱃지가 없어야 함
    for (const badgeText of finalTexts) {
      const value = parseInt(badgeText.trim());
      expect(value).toBeGreaterThan(0);
    }
    expect(finalTexts.length).toBeGreaterThan(0);
  });

  test('should verify API is called only once per member selection', async ({ page }) => {
    let apiCallCount = 0;

    // API 호출 모니터링
    page.on('request', (request) => {
      if (request.url().includes('/api/graph')) {
        apiCallCount++;
        console.log(`API call ${apiCallCount}: ${request.url()}`);
      }
    });

    // 의원 선택
    const searchInput = page.locator('input[placeholder*="의원 이름"]');
    await searchInput.fill('김영배');
    await page.waitForTimeout(1000);

    const firstResult = page.locator('[class*="cursor-pointer"][class*="border-b"]').first();
    await firstResult.click();

    // 네트워크 로딩 대기
    await page.waitForSelector('.react-flow', { timeout: 10000 });

    // 첫 번째 API 호출 완료 후 카운트 확인
    const initialApiCalls = apiCallCount;
    console.log(`Initial API calls: ${initialApiCalls}`);
    expect(initialApiCalls).toBe(1);

    // direction 변경 시 추가 API 호출이 없어야 함
    await page.locator('button:has-text("받은 것")').click();
    await page.waitForTimeout(1000);

    await page.locator('button:has-text("준 것")').click();
    await page.waitForTimeout(1000);

    await page.locator('button:has-text("전체")').click();
    await page.waitForTimeout(1000);

    // API 호출 횟수가 증가하지 않았는지 확인
    const finalApiCalls = apiCallCount;
    console.log(`Final API calls: ${finalApiCalls}`);
    expect(finalApiCalls).toBe(initialApiCalls); // 동일한 의원에 대해서는 추가 API 호출 없음
  });

  test('should display correct badge colors for different directions', async ({ page }) => {
    // 의원 선택
    const searchInput = page.locator('input[placeholder*="의원 이름"]');
    await searchInput.fill('김영배');
    await page.waitForTimeout(1000);

    const firstResult = page.locator('[class*="cursor-pointer"][class*="border-b"]').first();
    await firstResult.click();

    await page.waitForSelector('.react-flow', { timeout: 10000 });

    // "전체" 모드 - 파란색 뱃지
    let badges = page.locator('.react-flow [class*="bg-blue-600"]');
    await expect(badges.first()).toBeVisible({ timeout: 5000 });

    // "받은 것" 모드 - 초록색 뱃지
    await page.locator('button:has-text("받은 것")').click();
    await page.waitForTimeout(1000);

    badges = page.locator('.react-flow [class*="bg-green-600"]');
    await expect(badges.first()).toBeVisible({ timeout: 5000 });

    // "준 것" 모드 - 주황색 뱃지
    await page.locator('button:has-text("준 것")').click();
    await page.waitForTimeout(1000);

    badges = page.locator('.react-flow [class*="bg-orange-600"]');
    await expect(badges.first()).toBeVisible({ timeout: 5000 });
  });
});