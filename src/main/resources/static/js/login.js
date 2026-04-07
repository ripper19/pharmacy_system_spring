document.getElementById("loginform").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    console.log("Trying login using", email);
    console.log("Password is ", password);

    try{
        const res = await fetch("http://localhost:8080/auth/login",{
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({email,password})
        });
        if(!res.ok) throw new Error("Login Failed");

        const {name, email: bemail, role}= await res.json();
        localStorage.setItem('user', JSON.stringify({name,bemail,role }));

        window.location.replace("dash.html")
    }catch(e){
        alert("Invalid credentials.");
    }
}
);