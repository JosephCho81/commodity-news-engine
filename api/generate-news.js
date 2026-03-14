import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

export default async function handler(req, res) {

const today = new Date().toISOString().slice(0,10)

// Firebase 설정
const firebaseConfig = {
 apiKey: "YOUR_FIREBASE_API_KEY",
 authDomain: "YOUR_PROJECT.firebaseapp.com",
 projectId: "YOUR_PROJECT_ID",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)


// 오늘 뉴스 존재 확인
const todayDoc = await getDoc(doc(db,"daily_news",today))

if(todayDoc.exists()){
 return res.json({
 status:"already-exists",
 data: todayDoc.data()
 })
}


// 뉴스 API 호출
const news = await fetch(
`https://newsapi.org/v2/everything?q=aluminum OR scrap OR iron ore OR copper OR mining&language=en&pageSize=10&sortBy=publishedAt&apiKey=YOUR_NEWS_API_KEY`
)

const newsData = await news.json()

if(!newsData.articles){
 return res.json({error:"news api failed"})
}


// 가격 데이터 수집
const price = await fetch(
"https://query1.finance.yahoo.com/v7/finance/quote?symbols=ALI=F,HG=F,TIO=F,SLX"
)

const priceData = await price.json()

const market = priceData.quoteResponse.result

const aluminum =
market.find(m=>m.symbol==="ALI=F")?.regularMarketPrice || null

const copper =
market.find(m=>m.symbol==="HG=F")?.regularMarketPrice || null

const ironOre =
market.find(m=>m.symbol==="TIO=F")?.regularMarketPrice || null

const scrap =
market.find(m=>m.symbol==="SLX")?.regularMarketPrice || null



// 어제 가격 조회
const yesterdayDate = new Date(Date.now() - 86400000)
  .toISOString()
  .slice(0,10)

const yesterdayDoc = await getDoc(doc(db,"daily_news",yesterdayDate))

let change = {}

if(yesterdayDoc.exists()){

 const y = yesterdayDoc.data().prices

 change = {

 aluminum:
 ((aluminum - y.aluminum) / y.aluminum * 100).toFixed(2),

 copper:
 ((copper - y.copper) / y.copper * 100).toFixed(2),

 ironOre:
 ((ironOre - y.ironOre) / y.ironOre * 100).toFixed(2),

 scrap:
 ((scrap - y.scrap) / y.scrap * 100).toFixed(2)

 }

}


// 뉴스 간단 정리
const simpleNews = newsData.articles.map(n => ({
title:n.title,
description:n.description
}))


// 중요 뉴스 필터
const filterAI = await fetch(
"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_GEMINI_KEY",
{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify({

contents:[{
parts:[{
text:`

다음 뉴스 중 글로벌 금속 시장에 가장 중요한 뉴스 3개 선택

뉴스:
${JSON.stringify(simpleNews)}

형식
1. 제목
2. 제목
3. 제목

`
}]
}]

})
}
)

const filterResult = await filterAI.json()

const importantNews =
filterResult?.candidates?.[0]?.content?.parts?.[0]?.text || ""



// 시장 브리핑 생성
const briefingAI = await fetch(
"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_GEMINI_KEY",
{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify({

contents:[{
parts:[{
text:`

다음 데이터를 분석하여 글로벌 금속 시장 브리핑 작성

가격 데이터

Aluminum: ${aluminum} (${change.aluminum || 0}%)
Copper: ${copper} (${change.copper || 0}%)
Iron Ore: ${ironOre} (${change.ironOre || 0}%)
Steel Scrap: ${scrap} (${change.scrap || 0}%)

뉴스:
${importantNews}

조건

1. 오늘 글로벌 금속시장 핵심 요약 (5줄)

2. 가격 상승 또는 하락 이유 설명

3. 알루미늄 시장 전망

4. 철스크랩 시장 전망

5. 제강사 원료 구매팀 관점 내일 시장 방향

`
}]
}]

})
}
)

const briefingResult = await briefingAI.json()

const briefing =
briefingResult?.candidates?.[0]?.content?.parts?.[0]?.text || ""



// Firebase 저장
await setDoc(doc(db,"daily_news",today),{

date: today,

daily_briefing: briefing,

prices:{
 aluminum,
 copper,
 ironOre,
 scrap
},

change:{
 aluminum: change.aluminum || 0,
 copper: change.copper || 0,
 ironOre: change.ironOre || 0,
 scrap: change.scrap || 0
},

news: newsData.articles.map(n => ({
title:n.title,
url:n.url,
summary:n.description
}))

})



res.json({
status:"saved",
date:today
})

}
