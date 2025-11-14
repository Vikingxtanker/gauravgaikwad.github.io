const swiperDic = new Swiper('.dic-slider', {
  effect: 'coverflow',
  grabCursor: true,
  centeredSlides: true,
  slidesPerView: 1,
  loop: true,
  coverflowEffect: {
    rotate: 0,
    stretch: 0,
    depth: 100,
    modifier: 2,
    slideShadows: false,
  },
  autoplay: {
    delay: 3000,
    disableOnInteraction: false,
  }
});

// Custom arrows
document.querySelector('.swiper-button-prev-custom').addEventListener('click', () => swiperDic.slidePrev());
document.querySelector('.swiper-button-next-custom').addEventListener('click', () => swiperDic.slideNext());
