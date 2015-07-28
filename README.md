##oss-sync
[阿里云OSS](http://www.aliyun.com/product/oss) 同步工具

###Install
```bash
npm i oss-sync -g
```

###How to use
```bash
$ osync <config json file>
$
$ Options:
$
$   -f, --force-upload      重新上传所有文件
$   -i, --incremental-mode  增量模式
```
oss-sync 会自动检测当前工作目录下是否存在`.oss-sync.json`并将其作为配置文件加载，设置文件应该包含这些设定：
* `source` - 准备同步到 OSS 上的目录
* `dest` - OSS bucket 上的目标位置
* `accessKeyId` - 你的 OSS accessKeyId
* `secretAccessKey` - 你的 OSS secretAccessKey
* `endpoint` -  OSS 实例所在地区
* `bucket` - bucket 名
* `incrementalMode` - 是否使用增量模式，在增量模式的情况下 oss-sync 将只会上传那些新增和修改过的文件

![](http://i3.tietuku.com/5b5382997207e435.png)

###Tips
* oss-sync 通过使用 [git](http://git-scm.com/) 管理文件树生成的 sha1 值来检测文件的变化，会在同步的目录下生成一个`.sync`的文件夹
* oss-sync 会忽略所有以`.`开头的文件和文件夹
* 文件名中若有奇怪的字符可能导致奇怪的后果
* 若你的文件数量非常多且不太在乎 OSS 上的存储空间，建议使用增量模式