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


// 1️⃣ 이미 오늘 뉴스가 있는지 확인
const todayDoc = await getDoc(doc(db,"daily_news",today))

if(todayDoc.exists()){
 return res.json({
 status:"already-exists",
 data: todayDoc.data()
 })
}


// 2️⃣ 뉴스 API 호출
const news = await fetch(
`https://newsapi.org/v2/everything?q=aluminum OR scrap OR iron ore OR copper OR mining&language=en&pageSize=10&sortBy=publishedAt&apiKey=YOUR_NEWS_API_KEY`
)

const newsData = await news.json()

if(!newsData.articles){
 return res.json({error:"news api failed"})
}


// 3️⃣ 원자재 가격 데이터 수집
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



// 4️⃣ 뉴스 중요도 필터
const simpleNews = newsData.articles.map(n => ({
title:n.title,
description:n.description
}))

const filterAI = await fetch(
"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_GEMINI_KEY",
{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify({

contents:[{
parts:[{
text:`

다음 뉴스 중 글로벌 금속/원자재 시장에 가장 중요한 뉴스 3개를 선택하라.

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



// 5️⃣ 시장 브리핑 생성
const briefingAI = await fetch(
"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_GEMINI_KEY",
{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify({

contents:[{
parts:[{
text:`

다음 데이터로 글로벌 원자재 시장 브리핑 작성

가격 데이터
LME Aluminum: ${aluminum}
Copper: ${copper}
Iron Ore: ${ironOre}
Steel Scrap: ${scrap}

중요 뉴스:
${importantNews}

조건

1. 오늘 글로벌 금속시장 핵심 요약 (5줄)
2. 알루미늄 시장 영향
3. 철스크랩 시장 영향
4. 철광석 시장 방향
5. 제강사 원료구매팀 관점 내일 시장 전망

`
}]
}]

})
}
)

const briefingResult = await briefingAI.json()

const briefing =
briefingResult?.candidates?.[0]?.content?.parts?.[0]?.text || ""



// 6️⃣ Firebase 저장
await setDoc(doc(db,"daily_news",today),{

date: today,

daily_briefing: briefing,

prices:{
 aluminum: aluminum,
 copper: copper,
 ironOre: ironOre,
 scrap: scrap
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
