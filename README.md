# 廣告音樂工作坊 Ad Music Workshop

給香港小三（大約 8 歲）用的課堂原型。學生先看一段廣告，再用格子做一段 **10–30 秒**、配合畫面心情的配樂，然後把廣告和自己的音樂同步再看一次。

沒有 AI、沒有帳戶、沒有後端，也**不會儲存學生資料**。旋律樂器及鋼琴和弦使用隨程式附帶的真實樂器錄音（samples），鼓聲由 Tone.js 合成。

## 如何開啟

用 Chrome 直接打開專案裡的 `index.html` 就可以。`media/`、`js/`、`css/`、`vendor/` 要留在原位，不要只複製那一個 html 檔。第一下按 **開始 Start**。

iPad 不能這樣開。電腦和 iPad 要在同一個 Wi-Fi，在專案資料夾執行其中一個：

```bash
python3 -m http.server 8743 --bind 0.0.0.0
```

```bash
npx --yes serve -l tcp://0.0.0.0:8743
```

電腦用 Chrome 打開 [http://127.0.0.1:8743](http://127.0.0.1:8743)。iPad Safari 打開 `http://<電腦的 IP>:8743`。第一下一定要按 **開始 Start**，否則 iPad 不會出聲。

## 課堂可以怎樣用

1. 按 **開始 Start**。
2. 按 **睇廣告**，先看老師提供的課堂廣告（約 **5.2 秒**）。這段比配樂最短的 10 秒更短，所以廣告播完時，配樂會跟著停。長度滑桿仍然決定試聽和 WAV 有多長（10–30 秒）。想看自製的「陽光橙」短片，按 **陽光橙示範**。
3. 用圖卡選 **心情、速度、樂器、風格**。每一張圖卡會換上一組五聲音階、和弦、鼓和速度。
4. 可以改 16 格。上面是旋律，下面是鼓。旋律只會用五聲音階，所以不會彈出音階以外的音。
5. 按 **試聽** 只聽音樂。按 **用我的音樂睇** 會從 0 秒同時播放影片和音樂。暫停或拖動影片，音樂會跟著走。
6. 長度滑桿是這段配樂播多久（10–30 秒）。16 格會重複，直到時間完。
7. **下載 WAV** 會先做好檔案，再按 **儲存 WAV**（iPad 需要這第二下）。設定可以存成 JSON，之後再載入。JSON 和 WAV 都只會下載到學生自己的裝置。

也可以按 **載入影片**，改用裝置裡的廣告短片，再按 **返回廣告** 回到課堂廣告。影片不會上傳。播放時廣告原聲會關掉，好讓學生聽到自己的配樂。若載入的影片比滑桿更長，配樂會在滑桿的秒數停下，畫面可以繼續。

## 授權 Licences

- **Tone.js 14.7.77**（MIT）  
  Copyright (c) 2014-2020 Yotam Mann  
  完整條文在 [`vendor/tone/LICENSE.md`](vendor/tone/LICENSE.md)。  
  `vendor/tone/Tone.js` 是官方 UMD 版本，只刪了 source map 那一行，避免離線時瀏覽器再去抓 map 檔。
- `media/ad.mp4` 是老師提供的課堂廣告，片長 **5.15 秒**（H.264 Baseline、AAC，直向，約 826 KB）。沒有再轉碼。頁面播放時會關掉原聲。
- `media/placeholder.mp4` 和 `media/demo-poster.png` 是本專案畫的「陽光橙」示範，可按 **陽光橙示範** 換過去。沒有第三方音效樣本。
- 預設海報 `media/poster.jpg` 是課堂廣告的一格畫面。頁面程式是本專案原創。
- WAV 編碼是本專案自己寫的，沒有另引程式庫。
- [Chrome Music Lab](https://musiclab.chromeexperiments.com/)（Apache-2.0）只作小朋友介面的參考（大色塊、大按鈕、格子）。**沒有複製它的源碼**，所以這裡沒有再附 Apache 條文。

## 已知限制

- 低音大提琴、大提琴、鋼琴、長笛和鈴鐘使用真實錄音。鈴鐘採用 glockenspiel；弦樂採用拉弦音色。每種樂器只有一層演奏力度，Dynamics 調整音量，不會改變演奏手法。鼓組仍是合成聲音。
- 只有一段會重複的 16 格，不是按廣告每一幕分開寫的長曲。
- 預設廣告約 5.2 秒，短於配樂的 10–30 秒。一起看的時候，畫面結束，音樂就停。音樂長度一到也會停，即使影片還在播。
- 同步跟裝置的聲音延遲有關。暫停或拖動進度會再對齊一次，但有些 iPad 仍可能慢一點點。
- 匯出的 WAV 只有配樂，沒有影片。
- 先按「下載 WAV」做檔，再按「儲存 WAV」。這是為了讓 iPad Safari 在聲音算完之後仍允許下載。
- 請用近期的 Chrome 桌面版或 iPad Safari。沒有做帳號，也沒有把作品寫進 `localStorage`。

## 開發者檢查（可選）

課堂使用不需要 Node。若要在本機重跑自動檢查：

```bash
npm install --prefix /tmp/admusic-verify playwright-core
NODE_PATH=/tmp/admusic-verify/node_modules node tests/verify.mjs
```

伺服器要先在 `http://127.0.0.1:8743` 開著。檢查會用無頭 Chrome 確認：預設節奏、改格子、影片同步、WAV 和 JSON。

## 樂器音色更新

五種旋律樂器使用 25 個錄音 samples；附近音高由 Tone.Sampler 移調，保留原有各樂器的音域、節奏、速度與力度功能。和弦固定使用鋼琴錄音。首次按 Start 會先解碼音源，載入完成才可進入；失敗時可重試。最新 iPad / AirPods 音訊解鎖修正保留。

音源打包在 `js/instrument-samples.js`（約 8.8 MB），支援直接開啟 `index.html` 的離線使用，不依賴外部 CDN。Live playback 和 WAV 共用解碼後的錄音；匯出保留目前力度及 1.5 秒尾音。Samples 不等於完整演奏模擬：沒有多力度層、legato 或多次輪替錄音。

音源來源、授權及原始檔案 checksum 見 [Sample credits](vendor/instrument-samples/CREDITS.md) 和 [manifest](vendor/instrument-samples/manifest.json)。要重建音源可執行 `python3 tools/build-samples.py`（需要網絡）。

音訊 regression checks（需先啟動本機 HTTP server 於 8754）：

```bash
NODE_PATH=/path/to/node_modules node tests/sound-quality.cjs
```

可用 `CHROME` 指定 Chrome 路徑、`APP_URL` 指定伺服器。檢查五種樂器輸出、Live 播放、30 秒停止、file:// 離線模式及音源解碼失敗後重試。音色是否足夠適合課堂仍需真人試聽；Chrome 檢查不能代替實機 iPad / AirPods 測試。

## 兒歌式和聲

保留旋律，改用配合各風格的簡單 C／F／G 和弦。Float 使用 C–C–C–G，Hop／Dance 使用 C–F–C–F，March 使用 C–G–F–G。修正八步和弦只播放第 1、3 個和弦的索引問題，Live 和 WAV 採用相同時序。原和弦、新配法、拍數與兒歌參考見 [和聲說明](docs/HARMONY.md)。

## 介面語言

頁面頂部的「中文／English」可在開始前或播放中切換。介面每次只顯示所選語言，包括圖卡、提示、播放狀態及無障礙標籤。預設為繁體中文；切換不改動樂曲、力度或播放位置，也不儲存額外資料。

語言切換檢查：`NODE_PATH=/path/to/node_modules node tests/language.cjs`（支援 `APP_URL` 和 `CHROME`）。
