<template>
  <main class="baker-shell">
    <div class="baker-shell__background" aria-hidden="true"></div>
    <div class="baker-shell__overlay" aria-hidden="true"></div>

    <div class="baker-shell__frame">
      <!-- 标题 -->
      <header class="baker-shell__header">
        <slot name="header" />
        <div class="baker-shell__header-actions">
          <slot name="header-actions" />
        </div>
      </header>

      <div class="baker-shell__workspace">
        <!-- 左边分类导航，底下UID -->
        <aside class="baker-shell__navigation">
          <slot name="navigation" />
        </aside>
        <!-- 左中群聊好友列表 -->
        <aside class="baker-shell__session-list">
          <slot name="session-list" />
        </aside>
        <!-- 右边聊天区 -->
        <section class="baker-shell__conversation">
          <slot name="conversation" />
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.baker-shell {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  background-color: var(--baker-color-background);
}

.baker-shell__background,
.baker-shell__overlay {
  position: absolute;
  pointer-events: none;
}

/* 背景 */
.baker-shell__background {
  z-index: 0;
  inset: -24px; /* 给模糊留余地 */
  background: url('../../assets/baker/background/app-background.webp') center / cover no-repeat;
  filter: blur(18px) saturate(0.65);
  transform: scale(1.04);
}

/* 黑遮罩层 */
.baker-shell__overlay {
  z-index: 1;
  inset: 0;
  background: rgba(10, 10, 9, 0.78);
}

/* 内容层 */
.baker-shell__frame {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: clamp(12px, 1.6vh, 20px);
  min-height: 100vh;
  min-height: 100dvh;
  padding: clamp(24px, 2.2vh, 28px) clamp(20px, 3vw, 64px) clamp(20px, 4vh, 52px) 0;
}

/* 标题区 */
.baker-shell__header {
  display: flex;
  min-height: clamp(40px, 4.3vh, 52px);
  align-items: center;
  gap: clamp(16px, 2vh, 24px);
  padding-left: clamp(80px, 11.5vh, 136px);
}

.baker-shell__header-actions {
  position: relative;
  z-index: 3;
  display: flex;
  min-width: 0;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  margin-left: auto;
}

/* 工作区三栏 */
.baker-shell__workspace {
  display: grid;
  grid-template-columns:
    clamp(140px, 20vh, 230px)
    clamp(260px, 44vh, 520px)
    minmax(0, 1fr);
  gap: clamp(18px, 2vh, 28px);
  min-height: 0;
}

.baker-shell__navigation,
.baker-shell__session-list,
.baker-shell__conversation {
  min-width: 0;
  min-height: 0;
}

.baker-shell__navigation {
  position: relative;
  z-index: 1;
  overflow: visible;
}

.baker-shell__conversation {
  overflow: hidden;
}

.baker-shell__session-list {
  overflow: visible;
}
</style>
