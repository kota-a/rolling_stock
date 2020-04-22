# rolling_stock
## 実行方法
1. ファイル `rolling_stock/www/js/redmine.js` を以下の内容で作成

    ```
    const REDMINE = 
        {
            "url": "https://sample/redmine",
            "project_name": "sample_project",
            "api_key": "0123456789abcdef0123456789abcdef",
            "custom_field_id": {
                "required_num": 1,
                "stocked_num": 2
            }
        };
    ```
2. `cd rolling_stock`
3. `npm install`
4. `_run_android.bat` もしくは `_run_electron.bat` 実行
