const { expect } = require("@jest/globals");
const http = require("http");

describe("Kuru kuru~!", () => {
    it("should be able to rate limit", () => {
        let counter = 0;
        // spam 10 requests in a second and expect a 429
        for (let i = 0; i < 10; i++) {
            let reqClient = http
                .request(
                    {
                        host: "localhost",
                        port: 3000,
                        path: "/update",
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        }
                    },
                    (res) => {
                        res.setEncoding("utf8");
                        if (res.statusCode == 200) counter++;
                        else expect(res.statusCode).toBe(429);
                    }
                )
                .on("error", (e) => {
                    expect(e).toBe(null);
                    console.error(`problem with request: ${e.message}`);
                });
            reqClient.write(JSON.stringify({ count: 3, e: { isTrusted: true } }));
            reqClient.end();
            reqClient.destroy();
        }
        // if we didn't block until then, we have something wrong.
        expect(counter < 10).toBe(true);
    });
});
