const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * GPT 기반 차트 분석 및 점수 산출
 */

const ANALYSIS_PROMPT = `당신은 20년 경력의 전문 기술적 분석가입니다.
주어진 기술적 지표 데이터를 분석하여 투자 점수(1-100)를 매겨주세요.

## 점수 기준
- 90-100: 매우 강한 매수 신호 (여러 지표가 강한 상승 신호)
- 70-89: 매수 신호 (대부분의 지표가 긍정적)
- 50-69: 중립 (혼합 신호, 관망 권장)
- 30-49: 매도 신호 (대부분의 지표가 부정적)
- 1-29: 매우 강한 매도 신호 (여러 지표가 강한 하락 신호)

## 분석해야 할 패턴
1. 골든크로스/데드크로스 (MA50 vs MA200)
2. RSI 과매수(>70)/과매도(<30)
3. MACD 크로스오버
4. 볼린저밴드 위치
5. 거래량 변화
6. 스토캐스틱 신호
7. ADX 추세 강도
8. 지지/저항 수준

## 응답 형식 (JSON)
{
  "score": 1-100 사이 정수,
  "signal": "강력매수" | "매수" | "중립" | "매도" | "강력매도",
  "summary": "한줄 요약 (20자 이내)",
  "reasons": ["점수 산출 근거 1", "근거 2", "근거 3"],
  "patterns": ["발견된 차트 패턴들"],
  "support": 예상 지지선 가격,
  "resistance": 예상 저항선 가격,
  "shortTermOutlook": "단기 전망 (1-2주)",
  "riskLevel": "low" | "medium" | "high"
}

반드시 JSON 형식으로만 응답하세요.`;

/**
 * 종목 분석 및 점수 산출
 * @param {string} symbol - 종목 심볼
 * @param {string} name - 종목 이름
 * @param {Object} indicators - 기술적 지표 데이터
 * @returns {Object} 분석 결과
 */
const analyzeStock = async (symbol, name, indicators) => {
  try {
    const userMessage = `
## 종목 정보
- 심볼: ${symbol}
- 이름: ${name}
- 현재가: $${indicators.price.current}
- 24시간 변화: ${indicators.price.change24h}%
- 7일 변화: ${indicators.price.change7d || 'N/A'}%

## 기술적 지표

### RSI (14)
- 값: ${indicators.rsi.value}
- 해석: ${indicators.rsi.interpretation}

### MACD
- MACD: ${indicators.macd.macd}
- Signal: ${indicators.macd.signal}
- Histogram: ${indicators.macd.histogram}
- 해석: ${indicators.macd.interpretation}

### 이동평균선
- SMA 20: $${indicators.movingAverages.sma20}
- SMA 50: $${indicators.movingAverages.sma50}
- SMA 200: $${indicators.movingAverages.sma200 || 'N/A'}
- EMA 12: $${indicators.movingAverages.ema12}
- EMA 26: $${indicators.movingAverages.ema26}

### 볼린저 밴드
- 상단: $${indicators.bollingerBands.upper}
- 중단: $${indicators.bollingerBands.middle}
- 하단: $${indicators.bollingerBands.lower}
- 해석: ${indicators.bollingerBands.interpretation}

### 스토캐스틱
- %K: ${indicators.stochastic.k}
- %D: ${indicators.stochastic.d}
- 해석: ${indicators.stochastic.interpretation}

### ADX (추세 강도)
- ADX: ${indicators.adx.value}
- +DI: ${indicators.adx.ppiDI}
- -DI: ${indicators.adx.mdi}
- 해석: ${indicators.adx.interpretation}

### 거래량
- 현재: ${indicators.volume.current?.toLocaleString()}
- 20일 평균 대비: ${indicators.volume.ratio}
- 해석: ${indicators.volume.interpretation}

### ATR (변동성)
- 값: ${indicators.atr.value}

위 데이터를 기반으로 종합 분석과 1-100 점수를 JSON 형식으로 제공해주세요.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 비용 효율적
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3, // 일관된 분석을 위해 낮은 온도
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;

    // JSON 파싱 시도
    try {
      // JSON 블록 추출 (```json ... ``` 형식 처리)
      let jsonStr = content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const analysis = JSON.parse(jsonStr);

      return {
        success: true,
        symbol,
        name,
        timestamp: new Date().toISOString(),
        analysis,
        indicators: {
          rsi: indicators.rsi.value,
          macd: indicators.macd.interpretation,
          price: indicators.price.current,
          change24h: indicators.price.change24h
        }
      };
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      return {
        success: false,
        error: 'GPT 응답 파싱 실패',
        rawResponse: content
      };
    }
  } catch (error) {
    console.error('GPT 분석 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 간단한 점수만 빠르게 가져오기 (비용 절감용)
 */
const getQuickScore = async (symbol, indicators) => {
  try {
    const quickPrompt = `기술적 지표 기반 점수(1-100)만 제공하세요.

종목: ${symbol}
RSI: ${indicators.rsi.value}
MACD: ${indicators.macd.interpretation}
24h변화: ${indicators.price.change24h}%
거래량: ${indicators.volume.ratio}

JSON으로 응답: {"score": 숫자, "signal": "매수/중립/매도"}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: quickPrompt }],
      temperature: 0.2,
      max_tokens: 100,
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { score: 50, signal: '중립' };
  } catch (error) {
    console.error('Quick score error:', error);
    return { score: 50, signal: '중립', error: error.message };
  }
};

/**
 * 여러 종목 일괄 분석 (배치)
 */
const analyzeBatch = async (stocksWithIndicators) => {
  const results = await Promise.all(
    stocksWithIndicators.map(async ({ symbol, name, indicators }) => {
      // 속도를 위해 간단한 점수만
      const quickResult = await getQuickScore(symbol, indicators);
      return {
        symbol,
        name,
        score: quickResult.score,
        signal: quickResult.signal,
        price: indicators.price.current,
        change24h: indicators.price.change24h
      };
    })
  );

  return results;
};

/**
 * 규칙 기반 점수 계산 (GPT 대체용)
 * GPT API 실패 시 사용
 */
const calculateRuleBasedScore = (indicators) => {
  let score = 50; // 기본 점수
  const reasons = [];
  const patterns = [];

  // RSI 분석 (0-100)
  const rsi = parseFloat(indicators.rsi?.value);
  if (rsi) {
    if (rsi >= 70) {
      score -= 10;
      reasons.push('RSI 과매수 구간 (하락 가능성)');
      patterns.push('RSI 과매수');
    } else if (rsi <= 30) {
      score += 15;
      reasons.push('RSI 과매도 구간 (반등 가능성)');
      patterns.push('RSI 과매도');
    } else if (rsi >= 50 && rsi < 70) {
      score += 5;
      reasons.push('RSI 강세 구간');
    } else if (rsi < 50 && rsi > 30) {
      score -= 5;
      reasons.push('RSI 약세 구간');
    }
  }

  // MACD 분석
  const macdValue = parseFloat(indicators.macd?.histogram);
  if (macdValue !== undefined && !isNaN(macdValue)) {
    if (macdValue > 0) {
      score += 10;
      reasons.push('MACD 상승 모멘텀');
      patterns.push('MACD 골든크로스');
    } else {
      score -= 10;
      reasons.push('MACD 하락 모멘텀');
      patterns.push('MACD 데드크로스');
    }
  }

  // 볼린저밴드 분석
  const bbInterpretation = indicators.bollingerBands?.interpretation;
  if (bbInterpretation) {
    if (bbInterpretation.includes('상단')) {
      score -= 5;
      reasons.push('볼린저밴드 상단 근접 (조정 가능)');
    } else if (bbInterpretation.includes('하단')) {
      score += 10;
      reasons.push('볼린저밴드 하단 근접 (반등 기대)');
      patterns.push('볼린저밴드 하단 터치');
    }
  }

  // 거래량 분석
  const volumeRatio = parseFloat(indicators.volume?.ratio);
  if (volumeRatio) {
    if (volumeRatio > 150) {
      score += 5;
      reasons.push('거래량 급증 (관심 증가)');
      patterns.push('거래량 폭발');
    } else if (volumeRatio < 50) {
      score -= 5;
      reasons.push('거래량 감소 (관심 저조)');
    }
  }

  // 가격 변화 분석
  const change24h = indicators.price?.change24h;
  if (change24h !== undefined) {
    if (change24h > 5) {
      score += 5;
      patterns.push('강한 상승세');
    } else if (change24h < -5) {
      score -= 5;
      patterns.push('강한 하락세');
    }
  }

  // 이동평균선 분석
  const ma = indicators.movingAverages;
  if (ma) {
    const sma20 = parseFloat(ma.sma20);
    const sma50 = parseFloat(ma.sma50);
    const sma200 = parseFloat(ma.sma200);
    const currentPrice = indicators.price?.current;

    if (currentPrice && sma20 && currentPrice > sma20) {
      score += 3;
    }
    if (sma50 && sma200 && sma50 > sma200) {
      score += 7;
      patterns.push('골든크로스 (MA50>MA200)');
      reasons.push('장기 상승 추세');
    } else if (sma50 && sma200 && sma50 < sma200) {
      score -= 7;
      patterns.push('데드크로스 (MA50<MA200)');
      reasons.push('장기 하락 추세');
    }
  }

  // 점수 범위 제한
  score = Math.min(100, Math.max(1, Math.round(score)));

  // 신호 결정
  let signal;
  if (score >= 70) signal = '매수';
  else if (score >= 55) signal = '관망(긍정)';
  else if (score >= 45) signal = '중립';
  else if (score >= 30) signal = '관망(부정)';
  else signal = '매도';

  return {
    score,
    signal,
    summary: reasons[0] || '기술적 분석 기반 평가',
    reasons: reasons.slice(0, 3),
    patterns,
    riskLevel: score >= 60 ? 'low' : score >= 40 ? 'medium' : 'high',
    method: 'rule-based' // GPT가 아닌 규칙 기반임을 표시
  };
};

/**
 * GPT 또는 규칙 기반 점수 (자동 폴백)
 */
const getScoreWithFallback = async (symbol, indicators) => {
  try {
    // 먼저 GPT 시도
    const gptResult = await getQuickScore(symbol, indicators);
    if (!gptResult.error) {
      return { ...gptResult, method: 'gpt' };
    }
    throw new Error(gptResult.error);
  } catch (error) {
    console.log(`GPT 실패, 규칙 기반 점수 사용: ${error.message}`);
    // GPT 실패 시 규칙 기반 사용
    return calculateRuleBasedScore(indicators);
  }
};

/**
 * GPT Vision 기반 차트 분석 (Level 3 프리미엄)
 * 차트 이미지를 직접 분석하여 정확한 1-100 점수 산출
 */
const VISION_ANALYSIS_PROMPT = `당신은 20년 경력의 차트 분석 전문가입니다.
주어진 캔들스틱 차트 이미지를 분석하여 정확한 투자 점수(1-100)를 매겨주세요.

## 차트에서 확인해야 할 패턴
1. 캔들스틱 패턴 (도지, 해머, 엔갈핑, 쓰리화이트솔져 등)
2. 추세선 (상승/하락/횡보)
3. 지지/저항 수준
4. 이동평균선 배열 (정배열/역배열)
5. 거래량 변화
6. 볼린저밴드 위치
7. RSI 수준 (차트 하단)
8. 쐐기형, 삼각형, 헤드앤숄더 등 차트 패턴

## 점수 기준
- 90-100: 매우 강한 매수 (확실한 상승 패턴, 강한 지지선)
- 70-89: 매수 권장 (긍정적 패턴 다수)
- 50-69: 중립/관망 (혼합 신호)
- 30-49: 매도 고려 (부정적 패턴 다수)
- 1-29: 강한 매도 (확실한 하락 패턴, 지지선 붕괴)

## 응답 형식 (JSON만 출력)
{
  "score": 1-100,
  "signal": "강력매수" | "매수" | "중립" | "매도" | "강력매도",
  "confidence": "high" | "medium" | "low",
  "summary": "한줄 요약 (30자 이내)",
  "patterns": ["발견된 패턴1", "패턴2"],
  "reasons": ["점수 산출 근거1", "근거2", "근거3"],
  "support": 지지선 가격 (숫자 또는 null),
  "resistance": 저항선 가격 (숫자 또는 null),
  "trend": "uptrend" | "downtrend" | "sideways",
  "riskLevel": "low" | "medium" | "high",
  "shortTermOutlook": "단기 전망 (1-2주)"
}`;

/**
 * Vision API로 차트 이미지 분석
 * @param {string} base64Image - Base64 인코딩된 차트 이미지
 * @param {string} symbol - 종목 심볼
 * @param {Object} additionalData - 추가 참고 데이터 (가격, 지표 등)
 * @returns {Object} Vision 분석 결과
 */
const analyzeChartWithVision = async (base64Image, symbol, additionalData = {}) => {
  try {
    const userMessage = `
## 분석 대상: ${symbol} ${additionalData.timeframeLabel || ''}

차트 이미지를 분석하여 1-100 점수와 상세 분석을 JSON 형식으로 제공해주세요.

${additionalData.price ? `현재가: $${additionalData.price}` : ''}
${additionalData.rsi ? `참고 RSI: ${additionalData.rsi}` : ''}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Vision 지원 모델
      messages: [
        {
          role: 'system',
          content: VISION_ANALYSIS_PROMPT
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userMessage
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
                detail: 'high' // 상세 분석을 위해 high 사용
              }
            }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content;

    // JSON 파싱
    try {
      let jsonStr = content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        const plainMatch = content.match(/\{[\s\S]*\}/);
        if (plainMatch) {
          jsonStr = plainMatch[0];
        }
      }

      const analysis = JSON.parse(jsonStr);

      return {
        success: true,
        method: 'gpt-vision',
        symbol,
        timestamp: new Date().toISOString(),
        ...analysis,
        usage: {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
          estimatedCost: estimateVisionCost(response.usage)
        }
      };
    } catch (parseError) {
      console.error('Vision 응답 파싱 오류:', parseError);
      console.error('Raw response:', content);

      // 파싱 실패 시 규칙 기반으로 폴백
      return {
        success: false,
        method: 'gpt-vision-parse-failed',
        error: 'JSON 파싱 실패',
        rawResponse: content.substring(0, 500)
      };
    }
  } catch (error) {
    console.error('Vision API 오류:', error);

    // 할당량 초과 또는 기타 오류
    return {
      success: false,
      method: 'gpt-vision-failed',
      error: error.message,
      errorCode: error.code || 'unknown'
    };
  }
};

/**
 * Vision API 비용 추정
 * GPT-4o 기준: 입력 $5/1M tokens, 출력 $15/1M tokens
 * 이미지 토큰: 약 765 tokens (512x512 low) ~ 수천 tokens (high detail)
 */
const estimateVisionCost = (usage) => {
  if (!usage) return null;

  const inputCost = (usage.prompt_tokens / 1000000) * 5;
  const outputCost = (usage.completion_tokens / 1000000) * 15;

  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    estimatedUSD: (inputCost + outputCost).toFixed(6)
  };
};

/**
 * Level 3 분석 수행 (Vision 우선, 실패 시 폴백)
 */
const performLevel3Analysis = async (chartImage, symbol, indicators, additionalData = {}) => {
  // 1. Vision API 시도
  const visionResult = await analyzeChartWithVision(chartImage, symbol, {
    ...additionalData,
    price: indicators?.price?.current,
    rsi: indicators?.rsi?.value
  });

  if (visionResult.success) {
    return visionResult;
  }

  // 2. Vision 실패 시 GPT 텍스트 분석으로 폴백
  console.log(`Vision 분석 실패 (${visionResult.error}), 텍스트 분석으로 폴백`);

  try {
    const textResult = await analyzeStock(symbol, symbol, indicators);
    if (textResult.success) {
      return {
        ...textResult.analysis,
        method: 'gpt-text-fallback',
        visionError: visionResult.error
      };
    }
  } catch (textError) {
    console.log('텍스트 분석도 실패, 규칙 기반 사용');
  }

  // 3. 최종 폴백: 규칙 기반
  const ruleResult = calculateRuleBasedScore(indicators);
  return {
    ...ruleResult,
    method: 'rule-based-fallback',
    visionError: visionResult.error
  };
};

module.exports = {
  analyzeStock,
  getQuickScore,
  analyzeBatch,
  calculateRuleBasedScore,
  getScoreWithFallback,
  analyzeChartWithVision,
  performLevel3Analysis,
  estimateVisionCost
};
