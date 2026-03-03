import type { ListPost, RawPost } from "./types";

/**
 * 原始推荐算法
 * 计算文章的综合推荐分数，用于排序（分数越高越靠前）
 *
 * 评分权重从高到低：
 * 1. 置顶文章 (+1000)
 * 2. 手动优先级 (500 - priority) priority越小分数越高
 * 3. 基础推荐分 (recommendScore * 10)
 * 4. 时间衰减 (发布天数 * 0.1) 每天扣0.1分
 */
export function calculateRecommendScore(post: RawPost) {
  let score = 0;

  // 置顶权重最高，确保置顶文章排在前面
  if (post.data.pinned) score += 1000;

  // 优先级：priority值越小（1最高），得分越高
  if (post.data.priority !== undefined) {
    score += 500 - post.data.priority;
  }

  // 基础推荐分，可手动配置
  score += (post.data.recommendScore || 0) * 10;

  // 时间衰减：文章越旧，分数越低
  const days = (Date.now() - new Date(post.data.published).getTime()) / (1000 * 60 * 60 * 24);
  score -= days * 0.1;

  return score;
}

export function sortByScore(posts: ListPost[]) {
  return [...posts].sort((a, b) => b.score - a.score);
}

export function sortByTime(posts: RawPost[]) {
  return [...posts].sort(
    (a, b) => new Date(b.data.published).getTime() - new Date(a.data.published).getTime(),
  );
}
