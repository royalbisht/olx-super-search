import {
  useState,
  useMemo,
  useEffect
} from "react";

export default function OLXSuperSearchLanding() {

  const [query, setQuery] =
    useState("");

  const [results, setResults] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [includeText, setIncludeText] =
    useState("");

  const [excludeText, setExcludeText] =
    useState("");

  const [sortBy, setSortBy] =
    useState("relevance");

  const [maxDistance, setMaxDistance] =
    useState("");


  // ===== USER LOCATION =====

  const [userLat, setUserLat] =
    useState(null);

  const [userLon, setUserLon] =
    useState(null);


  // ===== GET USER LOCATION =====

  useEffect(() => {

    navigator.geolocation.getCurrentPosition(

      (position) => {

        setUserLat(
          position.coords.latitude
        );

        setUserLon(
          position.coords.longitude
        );

      },

      (err) => {

        console.error(
          "Location permission denied",
          err
        );

      }

    );

  }, []);


  // ===== SEARCH =====

  async function runSearch() {

    if (!query.trim()) return;

    setLoading(true);

    try {

      const response =
        await fetch(
          `http://localhost:3001/search?q=${encodeURIComponent(query)}`
        );

      const json =
        await response.json();

      const items =
        json.data || [];


      // ===== REMOVE DUPLICATES =====

      const uniqueMap =
        new Map();

      items.forEach(item => {

        if (
          !uniqueMap.has(item.id)
        ) {

          uniqueMap.set(
            item.id,
            item
          );

        }

      });

      setResults(
        Array.from(
          uniqueMap.values()
        )
      );

    }
    catch (err) {

      console.error(err);

    }

    setLoading(false);

  }


  // ===== DISTANCE CALCULATION =====

  function getDistanceKm(
    lat1,
    lon1,
    lat2,
    lon2
  ) {

    const R = 6371;

    const dLat =
      (lat2 - lat1) *
      Math.PI / 180;

    const dLon =
      (lon2 - lon1) *
      Math.PI / 180;

    const a =

      Math.sin(dLat / 2) *
      Math.sin(dLat / 2)

      +

      Math.cos(
        lat1 * Math.PI / 180
      )

      *

      Math.cos(
        lat2 * Math.PI / 180
      )

      *

      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c =
      2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return R * c;

  }


  // ===== FILTERING + SCORING =====

  const filteredResults =
    useMemo(() => {

      let items =
        [...results];


      // ===== SELLER COUNT =====

      const sellerCount =
        {};

      items.forEach(item => {

        const sellerId =

          item.user_id ||
          "unknown";

        sellerCount[sellerId] =

          (sellerCount[sellerId] || 0)

          + 1;

      });


      // ===== INCLUDE FILTER =====

      if (
        includeText.trim()
      ) {

        const includes =
          includeText
            .toLowerCase()
            .split(",")

            .map(t =>
              t.trim()
            )

            .filter(Boolean);


        items =
          items.filter(item => {

            const text =

              `${item.title || ""} ${item.description || ""}`

                .toLowerCase();

            return includes.every(word =>
              text.includes(word)
            );

          });

      }


      // ===== EXCLUDE FILTER =====

      if (
        excludeText.trim()
      ) {

        const excludes =
          excludeText
            .toLowerCase()
            .split(",")

            .map(t =>
              t.trim()
            )

            .filter(Boolean);


        items =
          items.filter(item => {

            const text =

              `${item.title || ""} ${item.description || ""}`

                .toLowerCase();

            return !excludes.some(word =>
              text.includes(word)
            );

          });

      }


      // ===== SMART PROCESSING =====

      items =
        items.map(item => {

          const text =

            `${item.title || ""} ${item.description || ""}`

              .toLowerCase();


          // ===== SELLER =====

          const sellerId =

            item.user_id ||
            "unknown";

          const listingCount =

            sellerCount[sellerId] || 0;


          // ===== DISTANCE =====

          const lat =
            item.locations?.[0]
              ?.lat;

          const lon =
            item.locations?.[0]
              ?.lon;

          let distanceKm =
            null;

          if (
            userLat &&
            userLon &&
            lat != null &&
            lon != null
          ) {

            distanceKm =
              getDistanceKm(

                parseFloat(userLat),
                parseFloat(userLon),

                parseFloat(lat),
                parseFloat(lon)

              );

          }


          // ===== INITIAL SCORES =====

          let trustScore = 100;

          let riskScore = 0;

          let dealScore = 50;


          // ===== SELLER TYPE =====

          let sellerType =
            "🟢 Individual";


          // ===== RENTAL =====

          const rentalWords = [

            "rent",
            "rental",
            "per day",
            "daily",
            "hire"

          ];

          const isRental =

            rentalWords.some(word =>
              text.includes(word)
            );


          if (isRental) {

            sellerType =
              "🔵 Rental";

            trustScore -= 20;

            riskScore += 20;

          }


          // ===== SCAM WORDS =====

          const scamWords = [

            "army",
            "urgent",
            "shipping",
            "advance",
            "token",
            "courier"

          ];

          const hasScamWords =

            scamWords.some(word =>
              text.includes(word)
            );


          if (hasScamWords) {

            sellerType =
              "🔴 Suspicious";

            trustScore -= 30;

            riskScore += 40;

          }


          // ===== DEALER DETECTION =====

          const dealerWords = [

            "shop",
            "store",
            "dealer",
            "gst",
            "invoice",
            "available stock",
            "wholesale"

          ];

          const looksLikeDealer =

            dealerWords.some(word =>

              text.includes(word)

            );


          if (

            item.is_business ||

            item.user_type !== "Regular" ||

            listingCount >= 10 ||

            looksLikeDealer

          ) {

            sellerType =
              "🟡 Dealer";

            trustScore -= 10;

            riskScore += 10;

          }


          // ===== MEDIATOR =====

          const mediatorWords = [

            "broker",
            "commission",
            "client",
            "arranged"

          ];

          const isMediator =

            mediatorWords.some(word =>
              text.includes(word)
            );


          if (isMediator) {

            sellerType =
              "🟠 Mediator";

            trustScore -= 20;

            riskScore += 20;

          }


          // ===== DISTANCE BONUS =====

          if (
            distanceKm != null &&
            distanceKm < 15
          ) {

            trustScore += 10;

            dealScore += 10;

          }


          // ===== SCORE LIMITS =====

          trustScore =
            Math.max(
              0,
              Math.min(100, trustScore)
            );

          riskScore =
            Math.max(
              0,
              Math.min(100, riskScore)
            );

          dealScore =
            Math.max(
              0,
              Math.min(100, dealScore)
            );


          return {

            ...item,

            sellerId,

            listingCount,

            distanceKm,

            trustScore,

            riskScore,

            dealScore,

            sellerType

          };

        });


      // ===== MAX DISTANCE =====

      if (maxDistance) {

        items =
          items.filter(item => {

            if (
              item.distanceKm == null
            ) {

              return false;

            }

            return (
              item.distanceKm <=
              parseFloat(maxDistance)
            );

          });

      }


      // ===== SORTING =====

      if (
        sortBy === "price_low"
      ) {

        items.sort((a, b) =>

          (a.price?.value?.raw || 0)

          -

          (b.price?.value?.raw || 0)

        );

      }


      if (
        sortBy === "price_high"
      ) {

        items.sort((a, b) =>

          (b.price?.value?.raw || 0)

          -

          (a.price?.value?.raw || 0)

        );

      }


      if (
        sortBy === "newest"
      ) {

        items.sort((a, b) =>

          new Date(
            b.created_at
          )

          -

          new Date(
            a.created_at
          )

        );

      }


      if (
        sortBy === "distance"
      ) {

        items.sort((a, b) =>

          (a.distanceKm || 999999)

          -

          (b.distanceKm || 999999)

        );

      }


      if (
        sortBy === "trust"
      ) {

        items.sort((a, b) =>

          b.trustScore -
          a.trustScore

        );

      }


      return items;

    }, [

      results,
      includeText,
      excludeText,
      sortBy,
      userLat,
      userLon,
      maxDistance

    ]);


  return (

    <div className="min-h-screen bg-[#f2f4f5] p-10">

      <div className="max-w-7xl mx-auto">


        {/* HEADER */}

        <h1 className="text-4xl font-black text-[#002f34]">

          OLX Super Search

        </h1>


        {/* LOCATION */}

        <div className="mt-4 text-sm text-gray-600">

          Your Location:
          {" "}

          {

            userLat && userLon

              ? `${userLat.toFixed(4)}, ${userLon.toFixed(4)}`

              : "Detecting..."

          }

        </div>


        {/* SEARCH */}

        <div className="mt-8 flex gap-4">

          <input

            type="text"

            placeholder="Search anything..."

            value={query}

            onChange={(e) =>
              setQuery(
                e.target.value
              )
            }

            className="flex-1 p-5 rounded-2xl border border-gray-300 outline-none text-lg"

          />

          <button

            onClick={runSearch}

            className="bg-[#002f34] text-white px-8 rounded-2xl font-bold"

          >

            SEARCH

          </button>

        </div>


        {/* FILTERS */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">

          <input

            type="text"

            placeholder="Include words"

            value={includeText}

            onChange={(e) =>
              setIncludeText(
                e.target.value
              )
            }

            className="p-4 rounded-2xl border border-gray-300 outline-none"

          />


          <input

            type="text"

            placeholder="Exclude words"

            value={excludeText}

            onChange={(e) =>
              setExcludeText(
                e.target.value
              )
            }

            className="p-4 rounded-2xl border border-gray-300 outline-none"

          />


          <input

            type="number"

            placeholder="Max Distance KM"

            value={maxDistance}

            onChange={(e) =>
              setMaxDistance(
                e.target.value
              )
            }

            className="p-4 rounded-2xl border border-gray-300 outline-none"

          />


          <select

            value={sortBy}

            onChange={(e) =>
              setSortBy(
                e.target.value
              )
            }

            className="p-4 rounded-2xl border border-gray-300 outline-none"

          >

            <option value="relevance">

              Relevance

            </option>

            <option value="distance">

              Nearest First

            </option>

            <option value="trust">

              Highest Trust

            </option>

            <option value="newest">

              Newest

            </option>

            <option value="price_low">

              Price Low to High

            </option>

            <option value="price_high">

              Price High to Low

            </option>

          </select>

        </div>


        {/* RESULT COUNT */}

        <div className="mt-8 text-lg font-bold text-[#002f34]">

          Total Results:
          {" "}
          {filteredResults.length}

        </div>


        {/* LOADING */}

        {loading && (

          <div className="mt-10 text-xl font-bold">

            Loading...

          </div>

        )}


        {/* RESULTS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">

          {filteredResults.map(item => (

            <div

              key={item.id}

              className="bg-white rounded-3xl overflow-hidden shadow-md border border-gray-200"

            >

              <img

                src={
                  item.images?.[0]?.url
                }

                alt="listing"

                className="w-full h-60 object-cover"

              />

              <div className="p-5">

                <div className="text-sm font-bold">

                  {item.sellerType}

                </div>


                <div className="mt-1 text-xs text-red-500">

                  Seller ID:
                  {" "}

                  {item.sellerId}

                </div>


                <div className="text-xs text-blue-500">

                  Seller Listings:
                  {" "}
                  {item.listingCount}

                </div>


                <h2 className="font-bold text-lg line-clamp-2 mt-2">

                  {item.title}

                </h2>


                <div className="text-3xl font-black mt-4 text-[#002f34]">

                  {

                    new Intl.NumberFormat(
                      "en-IN",

                      {
                        style:
                          "currency",

                        currency:
                          "INR",

                        maximumFractionDigits: 0

                      }

                    ).format(

                      item.price
                        ?.value
                        ?.raw || 0

                    )

                  }

                </div>


                <div className="mt-4 text-sm text-gray-500">

                  {

                    item
                      ?.locations_resolved
                      ?.ADMIN_LEVEL_3_name

                  }

                </div>


                <div className="mt-2 text-sm font-bold text-green-700">

                  {

                    item.distanceKm != null

                      ? `${item.distanceKm.toFixed(1)} km away`

                      : "Distance unavailable"

                  }

                </div>


                {/* SCORES */}

                <div className="mt-4 space-y-1 text-sm">

                  <div>

                    🟢 Trust:
                    {" "}
                    {item.trustScore}

                  </div>

                  <div>

                    🔴 Risk:
                    {" "}
                    {item.riskScore}

                  </div>

                  <div>

                    🟡 Deal:
                    {" "}
                    {item.dealScore}

                  </div>

                </div>


                <button

                  onClick={() =>
                    window.open(
                      `https://www.olx.in/item/${item.id}`,
                      "_blank"
                    )
                  }

                  className="w-full mt-5 bg-[#002f34] text-white py-3 rounded-2xl font-bold"

                >

                  OPEN LISTING

                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>

  );

}