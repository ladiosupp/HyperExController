package com.ladios.hxcontroller;

import android.app.Activity;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.net.Uri;

public class MainActivity extends Activity {
    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 前台常亮：App 在前台时不熄屏，切后台/退出自动恢复系统熄屏设置（用户 2026-11-15 定）。
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(false);
        web.setWebViewClient(new WebViewClient() {
            // 修复批1 M3：asset loader（WebViewAssetLoader 同款 URL，零新依赖 shouldInterceptRequest 实现）——
            // https://appassets.androidplatform.net/assets/www/* 流式返回 assets，影子推理的 wasm/模型
            // 不再走 base64 桥（免瞬态内存峰值与 JS 线程同步阻塞）。CORS * 供 file:// 页面 fetch/import()；
            // HxBridge.readAssetBase64 保留作 fallback。回调在 WebView IO 线程，getAssets() 线程安全。
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (u == null || !"appassets.androidplatform.net".equals(u.getHost())) return null;
                String path = u.getPath();
                if (path == null || !path.startsWith("/assets/www/")) return null;
                String asset = path.substring("/assets/".length());
                if (asset.contains("..")) return null;
                try {
                    java.io.InputStream is = getAssets().open(asset);
                    java.util.Map<String, String> headers = new java.util.HashMap<>();
                    headers.put("Access-Control-Allow-Origin", "*");
                    headers.put("Cache-Control", "no-store");
                    return new WebResourceResponse(mimeFor(asset), "UTF-8", 200, "OK", headers, is);
                } catch (Exception e) {
                    return null;
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new HxBridge(this), "HxBridge");
        web.loadUrl("file:///android_asset/www/index.html");
        setContentView(web);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // 回前台通知网页合并后台 buffer（网页另监听 visibilitychange 双保险）。
        if (web != null) {
            web.evaluateJavascript("window.dispatchEvent(new Event('hxresume'));", null);
        }
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    // 桥接层子线程回调网页用：切回主线程执行 evaluateJavascript。
    public void runOnWeb(final String js) {
        runOnUiThread(() -> { if (web != null) web.evaluateJavascript(js, null); });
    }

    private static String mimeFor(String path) {
        String p = path.toLowerCase(java.util.Locale.US);
        if (p.endsWith(".wasm")) return "application/wasm";
        if (p.endsWith(".mjs") || p.endsWith(".js")) return "text/javascript";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".onnx")) return "application/octet-stream";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        return "application/octet-stream";
    }
}

