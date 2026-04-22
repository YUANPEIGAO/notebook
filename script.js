// 读取同目录的文本文件并显示
fetch("./data.txt")
.then(res => res.text())
.then(content => {
    document.getElementById("text-box").innerText = content
})