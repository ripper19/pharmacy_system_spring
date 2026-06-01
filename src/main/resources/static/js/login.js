document.getElementById("loginform").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    console.log("Trying login using", email);
    console.log("Password is ", password);

    try{
        const res = await fetch("https://pharmacy-system-spring-utt5.onrender.com/auth/login",{
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({email,password})
        });
        if(!res.ok){
            const err = await res.json().catch(()=> ({}));
            throw new Error(err.message || "Login Failed");
        }

        const {name, email: bemail, role}= await res.json();
        localStorage.setItem('user', JSON.stringify({name,bemail,role }));

        window.location.replace("dash.html")
    }catch(e){
        if (e.message === "Failed to fetch" || e instanceof TypeError) {
            alert("Network error - check your connection or CORS settings.");
        } else {
            alert(e.message || "Invalid credentials.");
        }
    }
}
);