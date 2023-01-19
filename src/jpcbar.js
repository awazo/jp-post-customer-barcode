'use strict';

const Jpcbar = function() {

  this.generate = function(postalCode, address, targetElements) {
    if ((postalCode == null) || !/^[0-9]{7}$/.test(postalCode)) {
      throw 'incorrect postal code: ' + postalCode;
    }
    if ((address == null) || (typeof address !== 'string')) {
      throw 'incorrect address';
    }

    if (typeof postalCode !== 'string') postalCode = String(postalCode);

    if (postalCode.endsWith('00')) {
      console.log('代表の郵便番号(郵便番号簿における"上記に記載がない場合"に該当する郵便番号、下2けた(6～7けた目)が原則として"00")のためカスタマーバーコードの付番なし: ' + postalCode);
      return;
    }

    let kansuuji = this.kansuujiSimple + this.kansuujiUnit;
    let addressSuffix = '丁目|丁|番地|番|号|地割|線|の|ノ';
    let kansuujiRegexpStr = '([' + kansuuji + ']+)(' + addressSuffix + ')';
    let kansuujiRegexp = new RegExp(kansuujiRegexpStr, 'g');

    let addressNumber = address.toUpperCase();
    addressNumber = this.numberZenToHan(addressNumber);
    addressNumber = addressNumber.replaceAll(kansuujiRegexp,
      (match, p1, p2) => { return this.kansuujiToArabic(p1) + p2; });
    addressNumber = addressNumber.replaceAll(/[&\/\.・]/g, '');
    addressNumber = addressNumber.replaceAll(/[^-0-9A-Z]/g, '-');
    addressNumber = addressNumber.replaceAll(/[A-Z]{2,}/g, '-');
    addressNumber = addressNumber.replaceAll(/([0-9])F/g, '$1-');
    addressNumber = addressNumber.replaceAll(/-+/g, '-');
    addressNumber = addressNumber.replaceAll(/^-/g, '');
    addressNumber = addressNumber.replaceAll(/-$/g, '');
    addressNumber = addressNumber.replaceAll(/([A-Z])-/g, '$1');
    addressNumber = addressNumber.replaceAll(/-([A-Z])/g, '$1');

    let svg = this.generateFromAddressNumber(postalCode, addressNumber, targetElements);
    if (svg != null) return svg;
  };

  this.generateFromAddressNumber = function(postalCode, addressNumber, targetElements) {
    if ((postalCode == null) || !/^[0-9]{7}$/.test(postalCode)) {
      throw 'incorrect postal code: ' + postalCode;
    }
    if ((addressNumber == null) || (typeof addressNumber !== 'string')
        || !/^[-0-9A-Z]+$/.test(addressNumber)) {
      throw 'incorrect address number';
    }

    if (typeof postalCode !== 'string') postalCode = String(postalCode);

    if (postalCode.endsWith('00')) {
      console.log('代表の郵便番号(郵便番号簿における"上記に記載がない場合"に該当する郵便番号、下2けた(6～7けた目)が原則として"00")のためカスタマーバーコードの付番なし: ' + postalCode);
      return;
    }

    let code = this.dataToCode(postalCode + addressNumber);
    code.push(this.calcCheckDigit(code));

    let barCount = code.length * 3;
    code.unshift('start');
    barCount += 2;
    code.push('stop');
    barCount += 2;

    let svg = this.codeToImage(code, barCount);

    if (targetElements == null) {
      return { 'code': code, 'image': svg };
    }
    if (!(targetElements instanceof HTMLCollection)) {
      targetElements = [ targetElements ];
    }
    for (let targetElement of targetElements) {
      targetElement.setAttribute('data-jpcbarjs-generated', code.join(' '));
      targetElement.replaceChildren();  // clear children nodes
      targetElement.append(svg.cloneNode(true));
    }
  };

  this.numberZenToHan = function(target) {
    return target.replaceAll(/０/g, '0')
      .replaceAll(/１/g, '1')
      .replaceAll(/２/g, '2')
      .replaceAll(/３/g, '3')
      .replaceAll(/４/g, '4')
      .replaceAll(/５/g, '5')
      .replaceAll(/６/g, '6')
      .replaceAll(/７/g, '7')
      .replaceAll(/８/g, '8')
      .replaceAll(/９/g, '9');
  };

  this.kansuujiSimple = '〇一二三四五六七八九';
  this.kansuujiUnitMap = {
    '十': 10,
    '百': 100,
    '千': 1000,
    '万': 10000
  };
  this.kansuujiUnit = Object.keys(this.kansuujiUnitMap).join('');
  this.kansuujiToArabic = function(kansuuji) {
    let numArray = [];
    for (let kan of kansuuji) {
      if (this.kansuujiSimple.indexOf(kan) >= 0) {
        let num = this.kansuujiSimple.indexOf(kan);
        if (numArray.length <= 0) {
          numArray.push({ 'value': num, 'last': num, 'isUnit': false });
        } else {
          if (numArray[numArray.length - 1].isUnit) {
            numArray[numArray.length - 1].value += num;
            numArray[numArray.length - 1].last = num;
          } else {
            numArray.push({ 'value': num, 'last': num, 'isUnit': false });
          }
        }
      } else if (this.kansuujiUnit.indexOf(kan) >= 0) {
        let num = this.kansuujiUnitMap[kan];
        if (numArray.length <= 0) {
          numArray.push({ 'value': num, 'last': num, 'isUnit': true });
        } else {
          if (!numArray[numArray.length - 1].isUnit) {
            numArray[numArray.length - 1].value *= num;
            numArray[numArray.length - 1].last = num;
          } else if (numArray[numArray.length - 1].isUnit
              && (numArray[numArray.length - 1].last > num)) {
            numArray[numArray.length - 1].value += num;
            numArray[numArray.length - 1].last = num;
          } else {
            numArray.push({ 'value': num, 'last': num, 'isUnit': true });
          }
        }
      }
    }
    return numArray.reduce((acc, curr) => acc + String(curr.value), '');
  };

  this.dataToCode = function(data) {
    let code = [];
    for (let index = 0; index < data.length; index++) {
      code = code.concat(this.charToCode(data[index]));
    }
    code = code.slice(0, 20);
    while (code.length < 20) code.push('CC4');
    return code;
  };

  this.codeToImage = function(code, barCount) {
    let spaceCount = barCount - 1;

    let svgWidth = this.paddingLeft
      + (barCount * this.barWidth)
      + (spaceCount * this.spaceWidth)
      + this.paddingRight;
    let svgHeight = this.paddingTop
      + this.barHeightLong
      + this.paddingBottom;

    let svg = this.getSvgElement(svgWidth, svgHeight);

    let offsetX = this.paddingLeft;
    let offsetY = this.paddingTop;
    for (let elm of code) {
      let pattern = this.barPattern[elm];
      for (let patternNum of pattern) {
        switch(patternNum) {
          case 1:
            svg.append(this.getBarLong(offsetX, offsetY));
            break;
          case 2:
            svg.append(this.getBarSemiLongUpper(offsetX, offsetY));
            break;
          case 3:
            svg.append(this.getBarSemiLongLower(offsetX, offsetY));
            break;
          case 4:
            svg.append(this.getBarTiming(offsetX, offsetY));
            break;
        }
        offsetX += this.barWidth + this.spaceWidth;
      }
    }

    return svg;
  };

  this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  this.charToCode = function(char) {
    let index = this.alphabet.indexOf(char);
    if (index < 0) return [ char ];
    return [ 'CC' + String(Math.floor(index / 10) + 1), String(index % 10) ];
  };
  this.barPattern = { // 1: long, 2: upper, 3: lower, 4: timing
    '1': [ 1, 1, 4 ],
    '2': [ 1, 3, 2 ],
    '3': [ 3, 1, 2 ],
    '4': [ 1, 2, 3 ],
    '5': [ 1, 4, 1 ],
    '6': [ 3, 2, 1 ],
    '7': [ 2, 1, 3 ],
    '8': [ 2, 3, 1 ],
    '9': [ 4, 1, 1 ],
    '0': [ 1, 4, 4 ],
    '-': [ 4, 1, 4 ],
    'CC1': [ 3, 2, 4 ],
    'CC2': [ 3, 4, 2 ],
    'CC3': [ 2, 3, 4 ],
    'CC4': [ 4, 3, 2 ],
    'CC5': [ 2, 4, 3 ],
    'CC6': [ 4, 2, 3 ],
    'CC7': [ 4, 4, 1 ],
    'CC8': [ 1, 1, 1 ],
    'start': [ 1, 3 ],
    'stop': [ 3, 1 ]
  };

  this.calcCheckDigit = function(code) {
    let acc = 0;
    for (let elm of code) {
      if (elm === '-') acc += 10;
      else if (elm.startsWith('CC')) acc += (10 + parseInt(elm[2]));
      else acc += parseInt(elm);
    }
    let mod = acc % 19;
    let digit = ((mod === 0)? 0: (19 - mod));
    if (digit < 10) return String(digit);
    else if (digit === 10) return '-';
    else return 'CC' + String(digit % 10);
  };

  this.scale = 0.1;
  this.unit = 'mm';
  this.svgNamespace = 'http://www.w3.org/2000/svg';
  this.getSvgElement = function(width, height) {
    let w = width * this.scale;
    let h = height * this.scale;
    let svg = document.createElementNS(this.svgNamespace, 'svg');
    svg.setAttribute('width', w + this.unit);
    svg.setAttribute('height', h + this.unit);
    svg.setAttribute('viewBox', '0, 0, ' + w + ', ' + h);
    return svg;
  };
  this.getSvgRect = function(posX, posY, width, height, color) {
    let rect = document.createElementNS(this.svgNamespace, 'rect');
    rect.setAttribute('x', (posX * this.scale));
    rect.setAttribute('y', (posY * this.scale));
    rect.setAttribute('width', (width * this.scale));
    rect.setAttribute('height', (height * this.scale));
    rect.setAttribute('fill', color);
    return rect;
  };

  this.paddingLeft = 20;
  this.paddingRight = 20;
  this.paddingTop = 20;
  this.paddingBottom = 20;
  this.spaceWidth = 6;
  this.barWidth = 6;
  this.barHeightLong = 36;
  this.barHeightSemiLong = 24;
  this.barHeightTiming = 12;
  this.barOffsetYSemiLongLower = 12;
  this.barOffsetYTiming = 12;
  this.barcodeColor = '#000000';
  this.getBarLong = function(offsetX, offsetY) {
    return this.getSvgRect(offsetX, offsetY,
      this.barWidth, this.barHeightLong,
      this.barcodeColor);
  };
  this.getBarSemiLongUpper = function(offsetX, offsetY) {
    return this.getSvgRect(offsetX, offsetY,
      this.barWidth, this.barHeightSemiLong,
      this.barcodeColor);
  };
  this.getBarSemiLongLower = function(offsetX, offsetY) {
    return this.getSvgRect(offsetX, offsetY + this.barOffsetYSemiLongLower,
      this.barWidth, this.barHeightSemiLong,
      this.barcodeColor);
  };
  this.getBarTiming = function(offsetX, offsetY) {
    return this.getSvgRect(offsetX, offsetY + this.barOffsetYTiming,
      this.barWidth, this.barHeightTiming,
      this.barcodeColor);
  };

};

