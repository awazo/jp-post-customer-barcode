# jp-post-customer-barcode
郵便カスタマーバーコード生成jsライブラリ

## 使い方
```
<head>
  ...
  <script src="path/to/jpcbar.js"></script>
  ...
</head>
<body>
  ...
  <div class="result"></div>
  <button type="button" id="generate">generate</button>
  ...
  <script>
    let jpcbar = new Jpcbar();
    document.getElementById('generate').addEventListener('click', event => {
      let code = '3170055';
      let address = '十一丁目六番地一号　郵便タワー601';
      jpcbar.generate(code, address, document.getElementsByClassName('result'));
    });
  </script>
</body>
```
address として住所から抽出した住所表示番号を与えることもできる。`jpcbar.generateFromAddressNumber(code, addressNumber, document.getElementsByClassName('result'));` とする。
生成したコードは第三引数の要素に `data-jpcbarjs-generated` 属性として設定される。
第三引数を渡さない場合は、以下のオブジェクトを返す。
```
{
  'code': 生成したコード,
  'image': 生成したバーコードのsvg画像要素
}
```

## デモ
