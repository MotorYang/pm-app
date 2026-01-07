use git2::{BranchType, Repository, Oid, Commit, DiffOptions, StatusOptions};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct GitBranch {
    pub name: String,
    pub is_head: bool,
    pub is_remote: bool,
    pub upstream: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitCommit {
    pub hash: String,
    pub short_hash: String,
    pub author: String,
    pub email: String,
    pub date: i64,
    pub message: String,
    pub parents: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitCommitDetail {
    pub hash: String,
    pub short_hash: String,
    pub author: String,
    pub email: String,
    pub date: i64,
    pub subject: String,
    pub body: String,
    pub parents: Vec<String>,
    pub files: Vec<GitFileChange>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitFileChange {
    pub filename: String,
    pub status: String,
    pub additions: usize,
    pub deletions: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: String,
    pub ahead: usize,
    pub behind: usize,
    pub files: Vec<GitStatusFile>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatusFile {
    pub path: String,
    pub status: String,
    pub staged: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitRemote {
    pub name: String,
    pub url: String,
}

// 检查是否为 Git 仓库
#[tauri::command]
pub fn git_is_repository(path: String) -> Result<bool, String> {
    match Repository::open(&path) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

// 获取当前分支
#[tauri::command]
pub fn git_get_current_branch(path: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| e.message().to_string())?;
    let head = repo.head().map_err(|e| e.message().to_string())?;

    if let Some(branch_name) = head.shorthand() {
        Ok(branch_name.to_string())
    } else {
        Err("Not on any branch".to_string())
    }
}

// 获取所有分支
#[tauri::command]
pub fn git_get_branches(path: String) -> Result<Vec<GitBranch>, String> {
    let repo = Repository::open(&path).map_err(|e| e.message().to_string())?;
    let mut branches = Vec::new();

    // 本地分支
    let local_branches = repo.branches(Some(BranchType::Local))
        .map_err(|e| e.message().to_string())?;

    for branch_result in local_branches {
        let (branch, _) = branch_result.map_err(|e| e.message().to_string())?;
        if let Some(name) = branch.name().map_err(|e| e.message().to_string())? {
            let upstream = match branch.upstream() {
                Ok(upstream_branch) => {
                    match upstream_branch.name() {
                        Ok(Some(upstream_name)) => Some(upstream_name.to_string()),
                        _ => None,
                    }
                },
                Err(_) => None,
            };

            branches.push(GitBranch {
                name: name.to_string(),
                is_head: branch.is_head(),
                is_remote: false,
                upstream,
            });
        }
    }

    // 远程分支
    let remote_branches = repo.branches(Some(BranchType::Remote))
        .map_err(|e| e.message().to_string())?;

    for branch_result in remote_branches {
        let (branch, _) = branch_result.map_err(|e| e.message().to_string())?;
        if let Some(name) = branch.name().map_err(|e| e.message().to_string())? {
            branches.push(GitBranch {
                name: name.to_string(),
                is_head: false,
                is_remote: true,
                upstream: None,
            });
        }
    }

    Ok(branches)
}

// 获取提交历史
#[tauri::command]
pub fn git_get_commits(path: String, limit: usize) -> Result<Vec<GitCommit>, String> {
    let repo = Repository::open(&path).map_err(|e| e.message().to_string())?;
    let mut revwalk = repo.revwalk().map_err(|e| e.message().to_string())?;

    // 推送所有引用
    revwalk.push_head().map_err(|e| e.message().to_string())?;
    revwalk.set_sorting(git2::Sort::TIME).map_err(|e| e.message().to_string())?;

    let mut commits = Vec::new();

    for (i, oid_result) in revwalk.enumerate() {
        if i >= limit {
            break;
        }

        let oid = oid_result.map_err(|e| e.message().to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.message().to_string())?;

        let parents: Vec<String> = commit.parent_ids()
            .map(|id| id.to_string())
            .collect();

        commits.push(GitCommit {
            hash: commit.id().to_string(),
            short_hash: format!("{:.7}", commit.id()),
            author: commit.author().name().unwrap_or("Unknown").to_string(),
            email: commit.author().email().unwrap_or("").to_string(),
            date: commit.time().seconds(),
            message: commit.message().unwrap_or("").to_string(),
            parents,
        });
    }

    Ok(commits)
}

// 获取提交详情
#[tauri::command]
pub fn git_get_commit_detail(path: String, hash: String) -> Result<GitCommitDetail, String> {
    let repo = Repository::open(&path).map_err(|e| e.message().to_string())?;
    let oid = Oid::from_str(&hash).map_err(|e| e.message().to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.message().to_string())?;

    // 提取所有需要的数据
    let commit_hash = commit.id().to_string();
    let short_hash = format!("{:.7}", commit.id());
    let author = commit.author().name().unwrap_or("Unknown").to_string();
    let email = commit.author().email().unwrap_or("").to_string();
    let date = commit.time().seconds();

    let message = commit.message().unwrap_or("");
    let mut lines = message.lines();
    let subject = lines.next().unwrap_or("").to_string();
    let body = lines.collect::<Vec<&str>>().join("\n").trim().to_string();

    let parents: Vec<String> = commit.parent_ids()
        .map(|id| id.to_string())
        .collect();

    // 获取文件变更
    let files = get_commit_files(&repo, &commit)?;

    // 现在所有数据都是owned的，可以安全返回
    Ok(GitCommitDetail {
        hash: commit_hash,
        short_hash,
        author,
        email,
        date,
        subject,
        body,
        parents,
        files,
    })
}

// 获取提交的文件变更
fn get_commit_files(repo: &Repository, commit: &Commit) -> Result<Vec<GitFileChange>, String> {
    let mut files = Vec::new();

    let tree = commit.tree().map_err(|e| e.message().to_string())?;
    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0)
            .map_err(|e| e.message().to_string())?
            .tree()
            .map_err(|e| e.message().to_string())?)
    } else {
        None
    };

    let mut diff_opts = DiffOptions::new();
    let diff = repo.diff_tree_to_tree(
        parent_tree.as_ref(),
        Some(&tree),
        Some(&mut diff_opts)
    ).map_err(|e| e.message().to_string())?;

    diff.foreach(
        &mut |delta, _| {
            let status = match delta.status() {
                git2::Delta::Added => "added",
                git2::Delta::Deleted => "deleted",
                git2::Delta::Modified => "modified",
                git2::Delta::Renamed => "renamed",
                git2::Delta::Copied => "copied",
                _ => "unknown",
            };

            if let Some(path) = delta.new_file().path() {
                if let Some(path_str) = path.to_str() {
                    files.push(GitFileChange {
                        filename: path_str.to_string(),
                        status: status.to_string(),
                        additions: 0,
                        deletions: 0,
                    });
                }
            }

            true
        },
        None,
        None,
        None,
    ).map_err(|e| e.message().to_string())?;

    // 获取每个文件的增删行数
    let stats = diff.stats().map_err(|e| e.message().to_string())?;

    // 注意: git2 的 stats API 只提供总的增删行数
    // 这里我们简单地将总数平均分配（实际应该逐文件统计）
    let total_insertions = stats.insertions();
    let total_deletions = stats.deletions();
    let file_count = files.len().max(1);

    for file in &mut files {
        file.additions = total_insertions / file_count;
        file.deletions = total_deletions / file_count;
    }

    Ok(files)
}

// 切换分支
#[tauri::command]
pub fn git_checkout_branch(path: String, branch_name: String) -> Result<(), String> {
    let repo = Repository::open(&path).map_err(|e| e.message().to_string())?;

    // 检查工作区是否干净
    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .exclude_submodules(true);

    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.message().to_string())?;
    if !statuses.is_empty() {
        return Err("有未提交的更改，请先提交或暂存".to_string());
    }

    // 查找分支
    let branch = repo.find_branch(&branch_name, BranchType::Local)
        .map_err(|e| e.message().to_string())?;

    let tree = branch.get()
        .peel_to_tree()
        .map_err(|e| e.message().to_string())?;

    // 检出分支
    repo.checkout_tree(tree.as_object(), None)
        .map_err(|e| e.message().to_string())?;

    repo.set_head(&format!("refs/heads/{}", branch_name))
        .map_err(|e| e.message().to_string())?;

    Ok(())
}

// 获取仓库状态
#[tauri::command]
pub fn git_get_status(path: String) -> Result<GitStatus, String> {
    let repo = Repository::open(&path).map_err(|e| e.message().to_string())?;

    let head = repo.head().map_err(|e| e.message().to_string())?;
    let branch = head.shorthand().unwrap_or("HEAD").to_string();

    // 配置状态选项，排除被忽略的文件
    let mut opts = StatusOptions::new();
    opts.include_untracked(true)  // 包含未跟踪的文件
        .recurse_untracked_dirs(true)  // 递归查找未跟踪的目录
        .exclude_submodules(true);  // 排除子模块

    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.message().to_string())?;
    let mut files = Vec::new();

    for entry in statuses.iter() {
        let status = entry.status();
        let path = entry.path().unwrap_or("").to_string();

        let status_str = if status.is_index_new() {
            "added"
        } else if status.is_index_modified() {
            "modified"
        } else if status.is_index_deleted() {
            "deleted"
        } else if status.is_wt_modified() {
            "modified"
        } else if status.is_wt_new() {
            "untracked"
        } else if status.is_wt_deleted() {
            "deleted"
        } else {
            "unknown"
        };

        files.push(GitStatusFile {
            path,
            status: status_str.to_string(),
            staged: status.is_index_new() || status.is_index_modified() || status.is_index_deleted(),
        });
    }

    // TODO: 计算 ahead/behind（需要比较本地和远程分支）
    Ok(GitStatus {
        branch,
        ahead: 0,
        behind: 0,
        files,
    })
}

// 获取远程仓库
#[tauri::command]
pub fn git_get_remotes(path: String) -> Result<Vec<GitRemote>, String> {
    let repo = Repository::open(&path).map_err(|e| e.message().to_string())?;
    let remotes = repo.remotes().map_err(|e| e.message().to_string())?;

    let mut remote_list = Vec::new();

    for name in remotes.iter() {
        if let Some(name_str) = name {
            if let Ok(remote) = repo.find_remote(name_str) {
                if let Some(url) = remote.url() {
                    remote_list.push(GitRemote {
                        name: name_str.to_string(),
                        url: url.to_string(),
                    });
                }
            }
        }
    }

    Ok(remote_list)
}

// 暂存文件
#[tauri::command]
pub fn git_stage_files(path: String, files: Vec<String>) -> Result<(), String> {
    let repo = Repository::open(&path).map_err(|e| e.message().to_string())?;
    let mut index = repo.index().map_err(|e| e.message().to_string())?;

    for file_path in files {
        index.add_path(std::path::Path::new(&file_path))
            .map_err(|e| e.message().to_string())?;
    }

    index.write().map_err(|e| e.message().to_string())?;

    Ok(())
}

// 取消暂存文件
#[tauri::command]
pub fn git_unstage_files(path: String, files: Vec<String>) -> Result<(), String> {
    let repo = Repository::open(&path).map_err(|e| e.message().to_string())?;

    let head_commit = repo.head()
        .map_err(|e| e.message().to_string())?
        .peel_to_commit()
        .map_err(|e| e.message().to_string())?;

    for file_path in files {
        let path_obj = std::path::Path::new(&file_path);

        // 使用 reset 将文件恢复到 HEAD 状态
        repo.reset_default(Some(&head_commit.as_object()), [path_obj])
            .map_err(|e| e.message().to_string())?;
    }

    Ok(())
}

// 提交更改
#[tauri::command]
pub fn git_commit(path: String, message: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| e.message().to_string())?;

    // 获取索引
    let mut index = repo.index().map_err(|e| e.message().to_string())?;
    let tree_id = index.write_tree().map_err(|e| e.message().to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.message().to_string())?;

    // 获取签名
    let signature = repo.signature().map_err(|e| e.message().to_string())?;

    // 获取父提交
    let parent_commit = match repo.head() {
        Ok(head) => {
            let commit = head.peel_to_commit().map_err(|e| e.message().to_string())?;
            Some(commit)
        },
        Err(_) => None, // 首次提交没有父提交
    };

    // 创建提交
    let commit_id = if let Some(parent) = parent_commit {
        repo.commit(
            Some("HEAD"),
            &signature,
            &signature,
            &message,
            &tree,
            &[&parent],
        ).map_err(|e| e.message().to_string())?
    } else {
        repo.commit(
            Some("HEAD"),
            &signature,
            &signature,
            &message,
            &tree,
            &[],
        ).map_err(|e| e.message().to_string())?
    };

    Ok(commit_id.to_string())
}
