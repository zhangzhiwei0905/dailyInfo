# 文章排序系统设计

日期: 2026-06-05

## 概述

为每日简报中的文章列表增加多维度排序能力。包含两部分：
1. 后端新增 LLM 重要性评分，提升跨源排序质量
2. 前端在每个子分类 tab 内增加排序切换器（推荐/时间/来源）

## 1. LLM 重要性评分

### 评分锚点

Prompt 中写入以下锚点标准，要求 LLM 严格参照：

| 分数 | 含义 | 示例 |
|------|------|------|
| 9-10 | 突发重大事件 / 行业里程碑 | 新框架发布、重大政策落地 |
| 7-8 | 有实质影响的行业动态 | 大厂产品更新、重要数据分析 |
| 5-6 | 常规资讯，有参考价值 | 版本更新、常规报告 |
| 3-4 | 偏科普 / 回顾性内容 | 技术教程、行业观点 |
| 1-2 | 软文 / 推广 / 低信息密度 | 营销内容、转载旧闻 |

### 调用策略

- 按 subcategory 分批调用，每批 10-15 篇文章
- 输入：`title` + `excerpt`
- 输出：`{ url: string, importance: number }[]`（JSON 格式）
- 中英文模式：zh 模式下中文 prompt，en 模式下英文 prompt
- 复用现有 `lib/ai/llm.ts` 的 `runLlm()` 调度

### 数据存储

- `RawArticle` 新增 `importanceScore?: number` 字段
- 评分结果写入 `*-articles.json` 和数据库 `ReportArticle` 表
- 全流程兼容：缺失 importanceScore 时走现有兜底排序逻辑

## 2. 综合推荐评分调整

`lib/articles/recommendation.ts` 的评分公式调整为：

**有 importanceScore 时：**
```
score = importance * 0.50 + recency * 0.28 + rank * 0.22
```

**无 importanceScore 时（兜底）：**
```
score = recency * 0.58 + rank * 0.42
```

多样性惩罚（applyDiversityPenalty）保持不变。

## 3. 前端排序切换器

### 位置与样式

- 位于每个 subcategory tab 内容区域的右上角
- 三个按钮：`推荐` / `时间` / `来源`（zh）/ `Recommended` / `Time` / `Source`（en）
- 当前激活的按钮高亮（复用现有 `.tab.active` 风格）
- 移动端紧凑排列，不换行

### 排序逻辑

| 模式 | 排序依据 | 说明 |
|------|----------|------|
| 推荐（默认） | `recommendationScore` 降序 | 后端综合评分 |
| 时间 | `publishedAt` 降序 | 纯按发布时间 |
| 来源 | `sourceId` 分组，组内按推荐分降序 | 同源文章聚合 |

### 交互细节

- 纯前端 JS 排序，不请求服务器
- 切换时带 fade-in 过渡动画
- 排序状态通过 URL query param `?sort=time` 持久化，刷新后保留
- 不同 subcategory tab 的排序状态独立

### HTML 数据结构

每篇文章的 DOM 元素需携带排序所需的 data 属性：
```html
<article
  data-sort-score="86.3"
  data-sort-time="1749168000000"
  data-sort-source="qbitai"
  data-source="量子位"
>
```

排序切换时，JS 根据 data 属性重排 article 节点。

## 4. 数据流

```
articles
  → LLM enrichment (现有 summary 调用，不变)
  → LLM importance scoring (新增，按 subcategory 批量)
  → applyRecommendationScores (公式调整，加入 importance 权重)
  → render HTML (新增排序按钮 + data 属性)
  → 前端 JS 排序切换
```

## 5. 改动范围

| 文件 | 改动 |
|------|------|
| `lib/sources/types.ts` | 新增 `importanceScore` 字段 |
| `lib/ai/enrich.ts` | 新增 `enrichImportanceScores()` 函数 |
| `lib/ai/prompts/` | 新增重要性评分 prompt |
| `lib/articles/recommendation.ts` | 调整评分公式 |
| `lib/web/generation-service.ts` | 在 pipeline 中插入 importance scoring 步骤 |
| `lib/db/report-repository.ts` | ReportArticle 写入 importanceScore |
| `prisma/schema.prisma` | ReportArticle 新增 importanceScore 列 |
| `lib/output/render.ts` | 排序按钮 UI + article data 属性 + 前端排序 JS |
| `scripts/render-smoke-test.ts` | 更新测试断言 |
