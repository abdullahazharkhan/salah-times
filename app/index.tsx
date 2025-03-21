import React, { useEffect, useState } from "react";
import { Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
// import PushNotification from 'react-native-push-notification';

// PushNotification.createChannel(
//   {
//     channelId: "prayer-times", // (required)
//     channelName: "Prayer Times", // (required)
//     importance: 4,
//   },
//   (created: any) => console.log(`createChannel returned '${created}'`)
// );

// Helper function to convert "HH:MM" time to 12-hour format with AM/PM.
function convertTo12Hour(time24: string) {
  if (!time24.includes(":")) return time24;
  const [hourStr, minuteStr] = time24.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${ampm}`;
}

// Helper function to format milliseconds into HH:MM:SS string.
function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Function to update the persistent notification
// function updateNotification(nextPrayerName: string, timeLeftMs: number, sunriseLeft: number, midnightLeft: number) {
//   const message = `${nextPrayerName}: ${formatMs(timeLeftMs)}\nSunrise: ${formatMs(sunriseLeft)}\nMidnight: ${formatMs(midnightLeft)}`;

//   PushNotification.localNotification({
//     channelId: "prayer-times",
//     title: "Salah Times",
//     message: message, // This message appears in the notification
//     ongoing: true,    // Makes it persistent (cannot be swiped away)
//     autoCancel: false, // Prevent auto canceling
//     priority: "high",
//     visibility: "public",
//     importance: "max",
//   });
// }

export default function Index() {
  // 1 = Islamic Sciences Karachi, 4 = Umm al Qura
  const [selectedMethod, setSelectedMethod] = useState(1);
  // school: 0 or 1; when 1, include &school=1 in the query.
  const [school, setSchool] = useState(0);
  const [timings, setTimings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [khiTime, setKhiTime] = useState<any>(null);

  // Countdown states
  const [nextPrayerName, setNextPrayerName] = useState<string>("");
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [sunriseCountdown, setSunriseCountdown] = useState<number>(0);
  const [midnightCountdown, setMidnightCountdown] = useState<number>(0);

  // Fetch timings when selectedMethod or school changes.
  useEffect(() => {
    const fetchTimings = async () => {
      setLoading(true);
      try {
        let url = `https://api.aladhan.com/v1/timingsByAddress?address=Karachi,Pakistan&method=${selectedMethod}`;
        if (school === 1) {
          url += "&school=1";
        }
        const response = await fetch(url);
        const data = await response.json();
        if (data?.data?.timings) {
          setTimings(data.data.timings);
        }
      } catch (error) {
        console.error("Error fetching timings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTimings();
  }, [selectedMethod, school]);

  // Compute countdowns for next prayer, sunrise, and midnight.
  useEffect(() => {
    if (!timings) return;

    // Define the order of prayers (excluding Sunrise and Midnight).
    const prayerOrder = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

    function updateCountdowns() {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
      console.log(now);
      setKhiTime(now);
      // Determine the next prayer.
      let nextName = "";
      let smallestDiff = Number.MAX_VALUE;

      prayerOrder.forEach((prayer) => {
        if (!timings[prayer]) return;
        const [hourStr, minuteStr] = timings[prayer].split(":");
        let prayerTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          parseInt(hourStr, 10),
          parseInt(minuteStr, 10)
        );
        // If the prayer time has passed today, skip it.
        if (prayerTime < now) return;
        const diff = prayerTime.getTime() - now.getTime();
        if (diff < smallestDiff) {
          smallestDiff = diff;
          nextName = prayer;
        }
      });

      // If all today's prayers have passed, choose tomorrow's Fajr.
      if (!nextName) {
        const [hourStr, minuteStr] = timings["Fajr"].split(":");
        let tomorrowFajr = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
          parseInt(hourStr, 10),
          parseInt(minuteStr, 10)
        );
        smallestDiff = tomorrowFajr.getTime() - now.getTime();
        nextName = "Fajr";
      }
      setNextPrayerName(nextName);
      setTimeLeftMs(smallestDiff);

      // Calculate Sunrise countdown.
      if (timings["Sunrise"]) {
        const [hourStr, minuteStr] = timings["Sunrise"].split(":");
        let sunriseTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          parseInt(hourStr, 10),
          parseInt(minuteStr, 10)
        );
        if (sunriseTime < now) {
          // If today's sunrise has passed, set it to tomorrow.
          sunriseTime = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            parseInt(hourStr, 10),
            parseInt(minuteStr, 10)
          );
        }
        setSunriseCountdown(sunriseTime.getTime() - now.getTime());
      }

      if (timings["Midnight"]) {
        const [hourStr, minuteStr] = timings["Midnight"].split(":");
        let midnightTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          parseInt(hourStr, 10),
          parseInt(minuteStr, 10)
        );
        if (midnightTime < now) {
          // If today's sunrise has passed, set it to tomorrow.
          midnightTime = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            parseInt(hourStr, 10),
            parseInt(minuteStr, 10)
          );
        }
        setMidnightCountdown(midnightTime.getTime() - now.getTime());
      }
    }

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [timings]);

  return (
    <ScrollView className="bg-[#111728] flex-1 items-center p-4">
      <View className="w-full bg-[#00c871] py-6">
        <Text className="text-white font-extrabold text-5xl text-center">
          Salah Times
        </Text>
      </View>

      {/* Buttons to select timing method */}
      <View className="mt-6 flex-row space-x-4 mx-auto">
        <TouchableOpacity
          className={`mx-1 px-4 py-2 rounded ${selectedMethod === 1 ? "bg-blue-500" : "bg-gray-500"}`}
          onPress={() => setSelectedMethod(1)}
        >
          <Text className="text-white">Islamic Sciences, Karachi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`mx-1 px-4 py-2 rounded ${selectedMethod === 4 ? "bg-blue-500" : "bg-gray-500"}`}
          onPress={() => setSelectedMethod(4)}
        >
          <Text className="text-white">Umm al Qura</Text>
        </TouchableOpacity>
      </View>

      {/* Buttons to select school option */}
      <View className="mt-4 flex-row space-x-4 mx-auto">
        <TouchableOpacity
          className={`mx-1 px-4 py-2 rounded ${school === 0 ? "bg-blue-500" : "bg-gray-500"}`}
          onPress={() => setSchool(0)}
        >
          <Text className="text-white">Shafi School</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`mx-1 px-4 py-2 rounded ${school === 1 ? "bg-blue-500" : "bg-gray-500"}`}
          onPress={() => setSchool(1)}
        >
          <Text className="text-white">Hanafi School</Text>
        </TouchableOpacity>
      </View>

      {/* Display next prayer countdown */}
      {/* <View className="mt-6 w-full bg-[#1e2937] p-4 rounded mx-auto">
        {timings && nextPrayerName ? (
          <Text className="text-[#00c871] font-bold text-2xl text-center ">
            {khiTime} in {formatMs(timeLeftMs)}
          </Text>
        ) : null}
      </View> */}
      
      <View className="mt-6 w-full bg-[#1e2937] p-4 rounded mx-auto">
        {timings && nextPrayerName ? (
          <Text className="text-[#00c871] font-bold text-2xl text-center ">
            {nextPrayerName} in {formatMs(timeLeftMs)}
          </Text>
        ) : null}
      </View>
      
      {/* Display Sunrise and Midnight countdowns */}
      <View className="mt-4 w-full bg-[#1e2937] p-4 rounded mx-auto">
        {timings && timings["Sunrise"] ? (
          <Text className="text-[#00c871] font-bold text-2xl text-center  ">
            Sunrise in {formatMs(sunriseCountdown)}
          </Text>
        ) : null}
        <Text className="text-[#00c871] font-bold text-2xl text-center mt-2  ">
          Midnight in {formatMs(midnightCountdown)}
        </Text>
      </View>

      {/* Displaying the timings */}
      <View className="mt-6 w-full">
        {loading ? (
          <ActivityIndicator size="large" color="#00c871" />
        ) : timings ? (
          Object.entries(timings).map(([key, value]) => (
            <View
              key={key}
              className="flex-row justify-between mb-2 rounded p-2 bg-[#1e2937]"
            >
              <Text className="text-white font-bold text-2xl">{key}</Text>
              <Text className="text-white text-2xl font-bold">
                {convertTo12Hour(value as string)}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-white">No data available.</Text>
        )}
      </View>
    </ScrollView>
  );
}
