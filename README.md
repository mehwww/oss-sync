##oss-sync
oss同步工具

###Install
```bash
npm i oss-sync -g
```

###How to use
```bash
$ osync <config json file>
```
或者创建一份名为`.oss-sync.json`的设置文件，oss-sync会自动检测当前工作目录下的`.oss-sync.json`
设置文件应该包含这些设定：
* `source` - 准备同步到OSS上的目录
* `dest` - OSS bucket上的目标位置
* `accessKeyId` - 你的OSS accessKeyId
* `secretAccessKey` - 你的OSS secretAccessKey
* `endpoint` -  OSS 实例所在地区
* `bucket` - bucket名

![](http://i3.tietuku.com/5b5382997207e435.png)

###Tips
* oss-sync通过使用[git](http://git-scm.com/)管理文件树生成的sha1值来检测文件的变化，会在同步的目录下生成一个`.sync`的文件夹，如需重新同步将`.sync`和OSS上的文件夹删除即可
* oss-sync会忽略所有以`.`开头的文件和文件夹
* 文件名中若有奇怪的字符可能导致奇怪的后果

###ToDos
* progress 模块没有列入依赖项，请自行安装
