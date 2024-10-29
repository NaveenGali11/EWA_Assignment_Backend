const imgurUploadImage = (image) => {
    const headers = new Headers();
    headers.append('Authorization', `Client-ID ${process.env.IMG_UR_CLIENT_ID}`);
    const options = {
        method: 'POST',
        headers: headers,
        body: image
    };
    return fetch('https://api.imgur.com/3/image', options)
        .then(response => {
            console.log("RES :_ ",response);
            return response.json();
        })
        .then(data => {
            console.log("data.data.link :- ",data.data.link)
            return data.data.link;
        });
}

export {imgurUploadImage}