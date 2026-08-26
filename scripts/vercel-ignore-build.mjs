const branch = process.env.VERCEL_GIT_COMMIT_REF;

if (branch === "main") {
	console.log(
		"阻断 Vercel main 分支 Git 自动部署：生产发布必须走 snow-base 审批 workflow。",
	);
	process.exit(0);
}

console.log("非 main 分支或非 Vercel Git 上下文，允许 Vercel build。");
process.exit(1);
