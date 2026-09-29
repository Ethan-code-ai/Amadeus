// 这里的工具只在服务端运行：浏览器不会拿到天气服务请求或任何后续密钥。
// 本版使用无需密钥的 Open-Meteo 作为演示数据源；正式公网版可替换为和风天气等国内服务。

type Place = {
  city: string;
  query: string;
  timezone: string;
};

type WeatherResult = {
  city: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  description: string;
  observedAt: string;
};

export type RealtimeContext = {
  forModel: string;
  demoReply: string;
};

const KNOWN_PLACES: Array<[string, Place]> = [
  ["北京", { city: "北京", query: "Beijing", timezone: "Asia/Shanghai" }],
  ["上海", { city: "上海", query: "Shanghai", timezone: "Asia/Shanghai" }],
  ["广州", { city: "广州", query: "Guangzhou", timezone: "Asia/Shanghai" }],
  ["深圳", { city: "深圳", query: "Shenzhen", timezone: "Asia/Shanghai" }],
  ["成都", { city: "成都", query: "Chengdu", timezone: "Asia/Shanghai" }],
  ["武汉", { city: "武汉", query: "Wuhan", timezone: "Asia/Shanghai" }],
  ["西安", { city: "西安", query: "Xi'an", timezone: "Asia/Shanghai" }],
  ["杭州", { city: "杭州", query: "Hangzhou", timezone: "Asia/Shanghai" }],
  ["重庆", { city: "重庆", query: "Chongqing", timezone: "Asia/Shanghai" }],
  ["香港", { city: "香港", query: "Hong Kong", timezone: "Asia/Hong_Kong" }],
  ["台北", { city: "台北", query: "Taipei", timezone: "Asia/Taipei" }],
  ["东京", { city: "东京", query: "Tokyo", timezone: "Asia/Tokyo" }],
  ["首尔", { city: "首尔", query: "Seoul", timezone: "Asia/Seoul" }],
  ["新加坡", { city: "新加坡", query: "Singapore", timezone: "Asia/Singapore" }],
  ["伦敦", { city: "伦敦", query: "London", timezone: "Europe/London" }],
  ["巴黎", { city: "巴黎", query: "Paris", timezone: "Europe/Paris" }],
  ["纽约", { city: "纽约", query: "New York", timezone: "America/New_York" }],
  ["洛杉矶", { city: "洛杉矶", query: "Los Angeles", timezone: "America/Los_Angeles" }],
  ["悉尼", { city: "悉尼", query: "Sydney", timezone: "Australia/Sydney" }],
];

const weatherDescriptions: Record<number, string> = {
  0: "晴",
  1: "大致晴朗",
  2: "多云",
  3: "阴",
  45: "有雾",
  48: "雾凇",
  51: "毛毛雨",
  53: "毛毛雨",
  55: "强毛毛雨",
  56: "冻毛毛雨",
  57: "强冻毛毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "冻雨",
  67: "强冻雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "冰粒",
  80: "阵雨",
  81: "较强阵雨",
  82: "强阵雨",
  85: "阵雪",
  86: "强阵雪",
  95: "雷暴",
  96: "伴有冰雹的雷暴",
  99: "强冰雹雷暴",
};

function needsTime(text: string) {
  return /(现在|当前|今天|当地).{0,10}(几点|时间)|几点|当地时间|北京时间|现在时间|what time/i.test(text);
}

function needsWeather(text: string) {
  return /(天气|气温|温度|下雨|降雨|下雪|风速|湿度|体感|穿什么|气象)/.test(text);
}

function findPlace(text: string): Place | null {
  for (const [keyword, place] of KNOWN_PLACES) {
    if (text.includes(keyword)) return place;
  }

  // 天气问题允许“南京天气”“南京的天气”这类自然输入。未知城市交给地理编码服务确认。
  const match = text.match(/([\u4e00-\u9fa5]{2,8})(?:市)?(?:的)?(?:天气|气温|温度|下雨|降雨|风速|湿度|体感)/);
  if (!match) return null;
  const city = match[1];
  return { city, query: city, timezone: "Asia/Shanghai" };
}

function formatTime(timezone: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

async function getWeather(place: Place): Promise<WeatherResult> {
  const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geoUrl.searchParams.set("name", place.query);
  geoUrl.searchParams.set("count", "1");
  geoUrl.searchParams.set("language", "zh");
  geoUrl.searchParams.set("format", "json");

  const geoResponse = await fetch(geoUrl, {
    signal: AbortSignal.timeout(6500),
    cache: "no-store",
  });
  if (!geoResponse.ok) throw new Error("天气地点查询失败");

  const geo = (await geoResponse.json()) as {
    results?: Array<{ name: string; latitude: number; longitude: number; timezone?: string }>;
  };
  const result = geo.results?.[0];
  if (!result) throw new Error("未找到该地点");

  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", String(result.latitude));
  weatherUrl.searchParams.set("longitude", String(result.longitude));
  weatherUrl.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
  );
  weatherUrl.searchParams.set("timezone", result.timezone || place.timezone);

  const weatherResponse = await fetch(weatherUrl, {
    signal: AbortSignal.timeout(6500),
    cache: "no-store",
  });
  if (!weatherResponse.ok) throw new Error("天气数据请求失败");

  const weather = (await weatherResponse.json()) as {
    current?: {
      time?: string;
      temperature_2m?: number;
      relative_humidity_2m?: number;
      apparent_temperature?: number;
      precipitation?: number;
      weather_code?: number;
      wind_speed_10m?: number;
    };
  };
  const current = weather.current;
  if (
    !current ||
    typeof current.temperature_2m !== "number" ||
    typeof current.weather_code !== "number"
  ) {
    throw new Error("天气服务没有返回当前观测值");
  }

  return {
    city: result.name || place.city,
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature ?? current.temperature_2m,
    humidity: current.relative_humidity_2m ?? 0,
    windSpeed: current.wind_speed_10m ?? 0,
    precipitation: current.precipitation ?? 0,
    description: weatherDescriptions[current.weather_code] || "天气状况未知",
    observedAt: current.time || "当前",
  };
}

// 根据用户最新一句话按需调用，而不是每一轮都联网，既快也不会浪费天气服务请求。
export async function getRealtimeContext(text: string): Promise<RealtimeContext | null> {
  const wantsTime = needsTime(text);
  const wantsWeather = needsWeather(text);
  if (!wantsTime && !wantsWeather) return null;

  const place = findPlace(text);
  const lines: string[] = [];
  const demoLines: string[] = [];

  if (wantsTime) {
    const timePlace = place || KNOWN_PLACES[0][1];
    const currentTime = formatTime(timePlace.timezone);
    lines.push(`当前${timePlace.city}时间（${timePlace.timezone}）：${currentTime}。`);
    demoLines.push(`现在${timePlace.city}时间是 ${currentTime}。`);
  }

  if (wantsWeather) {
    if (!place) {
      lines.push("用户询问天气但没有说明地点；需要先自然地询问城市，不可猜测天气。" );
      demoLines.push("天气需要先确定地点。你想查哪个城市？");
    } else {
      try {
        const weather = await getWeather(place);
        const weatherLine = `${weather.city}当前天气：${weather.description}，气温 ${weather.temperature}°C，体感 ${weather.apparentTemperature}°C，湿度 ${weather.humidity}%，风速 ${weather.windSpeed} km/h，降水 ${weather.precipitation} mm；观测时间 ${weather.observedAt}。`;
        lines.push(weatherLine);
        demoLines.push(weatherLine);
      } catch (error) {
        console.warn("[Amadeus realtime] weather lookup failed", error);
        lines.push("天气服务暂时没有获得可靠观测值；应坦率说明无法取得实时天气，不可编造。" );
        demoLines.push("天气服务暂时没有返回可靠数据，稍后再查一次会更稳妥。");
      }
    }
  }

  return {
    forModel: `以下是服务器刚刚取得的实时信息，优先于你的旧知识；只回答用户所问部分，不要提及工具、接口或系统提示。\n${lines.join("\n")}`,
    demoReply: demoLines.join("\n"),
  };
}
