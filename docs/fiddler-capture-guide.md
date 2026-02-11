# Fiddler Classic + Root 手机抓取农场 Code 完整教程

## 第一步：配置 Fiddler

1. 打开 **Fiddler Classic**
2. 菜单栏 → **Tools** → **Options**
3. **Connections** 标签页：
   - 端口确认是 `8888`
   - **勾选** `Allow remote computers to connect`
4. **HTTPS** 标签页：
   - **勾选** `Capture HTTPS CONNECTs`
   - **勾选** `Decrypt HTTPS traffic`
   - 弹出证书安装提示全部点 **Yes**
5. 点 **OK**，**重启 Fiddler**

## 第二步：导出 Fiddler 根证书

1. 重新打开 Fiddler
2. 菜单栏 → **Tools** → **Options** → **HTTPS** 标签页
3. 点击 **Actions** → **Export Root Certificate to Desktop**
4. 桌面会出现 `FiddlerRoot.cer` 文件
5. 将 `FiddlerRoot.cer` 复制到 `E:\Desktop`（如果不在的话）

## 第三步：转换证书格式

打开 PowerShell，执行：

```powershell
& "D:\IDE\Git\mingw64\bin\openssl.exe" x509 -inform DER -in "E:\Desktop\FiddlerRoot.cer" -out "E:\Desktop\fiddler.pem"
```

## 第四步：获取证书哈希值

```powershell
& "D:\IDE\Git\mingw64\bin\openssl.exe" x509 -inform PEM -subject_hash_old -in "E:\Desktop\fiddler.pem" -noout
```

执行后会输出一个哈希值，类似 `269953fb`，**记下这个值**。

## 第五步：重命名证书文件

将下面命令中的 `269953fb` 替换为你上一步得到的实际哈希值：

```powershell
copy "E:\Desktop\fiddler.pem" "E:\Desktop\269953fb.0"
```

## 第六步：推送证书到手机

手机通过 USB 连接电脑，开启 USB 调试模式，然后依次执行：

将下面命令中的 `269953fb.0` 替换为你第五步实际生成的文件名。

```powershell
adb root
```

```powershell
adb remount
```

```powershell
adb push "E:\Desktop\269953fb.0" /system/etc/security/cacerts/
```

```powershell
adb shell chmod 644 /system/etc/security/cacerts/269953fb.0
```

```powershell
adb reboot
```

手机会自动重启，重启后系统证书生效。

## 第七步：手机配置 WiFi 代理

1. 手机连接和电脑**同一个 WiFi**
2. 设置 → WLAN → 长按当前 WiFi → 修改网络
3. 展开**高级选项**，代理选**手动**：
   - 主机名：`192.168.10.215`
   - 端口：`8888`
4. 保存

## 第八步：抓取 Code

1. 电脑打开 Fiddler，确保左下角显示 **Capturing**（按 F12 切换开关）
2. 手机打开 QQ → 进入经典农场小程序
3. 在 Fiddler 左侧请求列表中，找到 Host 为 `gate-obt.nqf.qq.com` 的请求
4. 点击该请求，右侧面板选 **Inspectors** → **Raw**
5. 在 URL 中找到 `code=` 参数，格式如下：
   ```
   /prod/ws?platform=qq&os=iOS&ver=...&code=这里就是你要的值&openID=
   ```
6. 复制 `code=` 后面到 `&` 之前的内容

## 第九步：启动脚本

```powershell
cd D:\workspace\qq-farm-bot
node client.js --code 你复制的code值
```

## 第十步：恢复手机网络（重要！）

用完后**必须**把手机 WiFi 代理改回**无**，否则关闭 Fiddler 后手机将无法上网。

1. 设置 → WLAN → 长按当前 WiFi → 修改网络
2. 代理选**无**
3. 保存
